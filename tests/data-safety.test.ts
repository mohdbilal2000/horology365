import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Data-safety guardrails.
 *
 * Products the store owner had entered by hand — and the photos he uploaded for
 * them — were destroyed once already. Two things made that possible:
 *
 *   1. `DELETE /api/admin/products/:id` hard-deleted the row.
 *   2. Re-seeding upserted the code's mock products over the live rows,
 *      reverting his edits and images.
 *
 * These tests fail the build if either becomes possible again.
 *
 * If one of these fails, do NOT loosen the test. It is telling you the change
 * you are making can destroy the owner's data.
 */

const ROOT = process.cwd();

function filesUnder(dir: string, exts = /\.tsx?$/): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...filesUnder(full, exts));
    else if (exts.test(entry)) out.push(full);
  }
  return out;
}

/** Comments are stripped so these checks judge code, not prose about it. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const SOURCES = [...filesUnder(path.join(ROOT, "src")), ...filesUnder(path.join(ROOT, "scripts"))]
  .map((file) => ({
    file: path.relative(ROOT, file),
    code: stripComments(readFileSync(file, "utf8")),
  }));

function read(rel: string): string {
  return stripComments(readFileSync(path.join(ROOT, rel), "utf8"));
}

test("no code path hard-deletes a product", () => {
  // `supabase.from("products").delete()` is what destroyed the owner's data.
  const offenders = SOURCES.filter((f) =>
    /from\(\s*["']products["']\s*\)[\s\S]{0,200}?\.delete\(/.test(f.code),
  ).map((f) => f.file);

  assert.deepEqual(
    offenders,
    [],
    `Products must be soft-deleted (set deleted_at), never removed. Found a hard delete in:\n  ${offenders.join("\n  ")}`,
  );
});

test("the product DELETE route soft-deletes and can be undone", () => {
  const route = read(path.join("src", "app", "api", "admin", "products", "[id]", "route.ts"));

  assert.match(
    route,
    /deleted_at:\s*new Date\(\)\.toISOString\(\)/,
    "DELETE must stamp deleted_at rather than removing the row.",
  );
  assert.doesNotMatch(
    route,
    /\.delete\(\)/,
    "The product route must not call .delete().",
  );
  assert.match(
    route,
    /export async function POST/,
    "A removed product must be restorable — the route needs a restore handler.",
  );
  assert.match(
    route,
    /deleted_at:\s*null/,
    "Restore must clear deleted_at.",
  );
});

test("seeding never overwrites an existing product", () => {
  // This is the most likely cause of the original loss: a re-seed rewrote live
  // products with the mock catalogue.
  for (const rel of [
    path.join("src", "app", "api", "admin", "seed", "route.ts"),
    path.join("scripts", "seed-supabase.ts"),
  ]) {
    const code = read(rel);
    const productUpsert = /from\(\s*["']products["']\s*\)\s*\.upsert\(([^;]*?)\)\s*;/s.exec(code)
      ?? /\.upsert\(\s*products\s*,\s*\{([^}]*)\}/s.exec(code);

    assert.ok(productUpsert, `${rel}: expected a products upsert to inspect.`);
    assert.match(
      productUpsert[0],
      /ignoreDuplicates:\s*true/,
      `${rel}: the products seed must pass ignoreDuplicates:true so it can only INSERT. ` +
        "Without it, re-seeding overwrites the owner's edited products and uploaded images.",
    );
  }
});

test("the storefront and admin list hide removed products", () => {
  assert.match(
    read(path.join("src", "lib", "data", "products.ts")),
    /\.is\(\s*["']deleted_at["']\s*,\s*null\s*\)/,
    "getAllProducts must filter out soft-deleted products.",
  );
  assert.match(
    read(path.join("src", "app", "api", "admin", "products", "route.ts")),
    /\.is\(\s*["']deleted_at["']\s*,\s*null\s*\)/,
    "The admin product list must filter out soft-deleted products by default.",
  );
});

test("admin changes are written to an append-only audit trail", () => {
  const audit = read(path.join("src", "lib", "data", "adminAudit.ts"));
  assert.doesNotMatch(
    audit,
    /from\(\s*["']admin_audit["']\s*\)[\s\S]{0,120}?\.(delete|update)\(/,
    "Audit entries must never be edited or removed.",
  );

  const idRoute = read(path.join("src", "app", "api", "admin", "products", "[id]", "route.ts"));
  for (const action of ["product.delete", "product.restore", "product.update"]) {
    assert.ok(
      idRoute.includes(action),
      `The product route must record a ${action} audit entry.`,
    );
  }
});

test("the database blocks deletion of products, orders and audit rows", () => {
  const migration = readFileSync(
    path.join(ROOT, "supabase", "migrations", "20260823-product-data-safety.sql"),
    "utf8",
  );
  for (const trigger of [
    "products_no_hard_delete",
    "orders_no_hard_delete",
    "admin_audit_append_only",
  ]) {
    assert.match(
      migration,
      new RegExp(`create trigger ${trigger}`),
      `The migration must keep the ${trigger} trigger — it is the backstop that stops a bug erasing data.`,
    );
  }
  assert.match(
    readFileSync(path.join(ROOT, "supabase", "schema.sql"), "utf8"),
    /deleted_at\s+timestamptz/,
    "schema.sql must declare products.deleted_at so a fresh project supports soft delete.",
  );
});
