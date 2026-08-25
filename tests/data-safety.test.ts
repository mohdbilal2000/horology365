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
  // A DELETE against products is what destroyed the owner's data.
  const offenders = SOURCES.filter((f) =>
    /delete\s+from\s+products\b/i.test(f.code),
  ).map((f) => f.file);

  assert.deepEqual(
    offenders,
    [],
    `Products must be soft-deleted (set deleted_at), never removed. Found a hard delete in:\n  ${offenders.join("\n  ")}`,
  );
});

test("removal is a soft delete and can be undone", () => {
  const queries = read(path.join("src", "lib", "data", "adminProductQueries.ts"));

  assert.match(
    queries,
    /set\s+deleted_at\s*=\s*now\(\)/,
    "Removal must stamp deleted_at rather than removing the row.",
  );
  assert.match(
    queries,
    /set\s+deleted_at\s*=\s*null/,
    "Restore must clear deleted_at.",
  );
  assert.doesNotMatch(
    queries,
    /delete\s+from/i,
    "The product data layer must contain no delete statement at all.",
  );

  const route = read(path.join("src", "app", "api", "admin", "products", "[id]", "route.ts"));
  assert.match(
    route,
    /export async function POST/,
    "A removed product must be restorable — the route needs a restore handler.",
  );
});

test("seeding never overwrites an existing product", () => {
  // This is the most likely cause of the original loss: a re-seed rewrote live
  // products with the mock catalogue.
  for (const rel of [
    path.join("src", "app", "api", "admin", "seed", "route.ts"),
    path.join("scripts", "seed-db.ts"),
  ]) {
    const code = read(rel);
    const productInsert = /insert\s+into\s+products[\s\S]*?on\s+conflict\s*\(\s*slug\s*\)\s*do\s+(\w+)/i.exec(
      code,
    );

    assert.ok(productInsert, `${rel}: expected a products insert to inspect.`);
    assert.equal(
      productInsert[1]?.toLowerCase(),
      "nothing",
      `${rel}: the products seed must be "on conflict (slug) do nothing" so it can only ` +
        "INSERT. \"do update\" overwrites the owner's edited products and uploaded images.",
    );
  }
});

test("the storefront and admin list hide removed products", () => {
  // The guarantee is that a removed product never reaches a shopper. How that
  // is enforced depends on where the storefront reads from, and during
  // maintenance mode it reads a file rather than the database — so there is no
  // SQL filter to look for. The rule is unchanged; only its location moved.
  const storefront = read(path.join("src", "lib", "data", "products.ts"));
  if (/from\s+products/i.test(storefront)) {
    assert.match(
      storefront,
      /where\s+deleted_at\s+is\s+null/i,
      "getAllProducts must filter out soft-deleted products.",
    );
  } else {
    const snapshot = JSON.parse(
      read(path.join("src", "lib", "data", "catalogueSnapshot.json")),
    ) as { slug: string; deletedAt?: string | null }[];
    assert.ok(snapshot.length > 0, "the shipped catalogue must not be empty.");
    const removed = snapshot.filter((p) => p.deletedAt);
    assert.deepEqual(
      removed.map((p) => p.slug),
      [],
      "a removed product must never be shipped in the catalogue the shop serves.",
    );
  }
  assert.match(
    read(path.join("src", "lib", "data", "adminProductQueries.ts")),
    /deleted_at\s+is\s+\$\{|deleted_at\s+is\s+null/i,
    "The admin product list must filter out soft-deleted products by default.",
  );
});

test("admin changes are written to an append-only audit trail", () => {
  const audit = read(path.join("src", "lib", "data", "adminAudit.ts"));
  assert.doesNotMatch(
    audit,
    /(update|delete\s+from)\s+admin_audit/i,
    "Audit entries must never be edited or removed.",
  );

  const queries = read(path.join("src", "lib", "data", "adminProductQueries.ts"));
  for (const action of ["product.delete", "product.restore", "product.update", "product.create"]) {
    assert.ok(
      queries.includes(action),
      `The product data layer must record a ${action} audit entry.`,
    );
  }
});

test("the database blocks deletion of products, orders and audit rows", () => {
  const migration = readFileSync(
    path.join(ROOT, "db", "migrations", "20260823-product-data-safety.sql"),
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
    readFileSync(path.join(ROOT, "db", "schema.sql"), "utf8"),
    /deleted_at\s+timestamptz/,
    "schema.sql must declare products.deleted_at so a fresh project supports soft delete.",
  );
});
