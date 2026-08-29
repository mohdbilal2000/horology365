import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * Data-safety guardrails.
 *
 * Products the store owner had entered by hand — and the photos he uploaded
 * for them — were destroyed once already, twice by different failures: a
 * hard DELETE, and a re-seed that upserted the mock catalogue over live rows.
 * The storage layer has since moved off Postgres onto Vercel Blob (see
 * DATA_SAFETY.md), but the guarantee these tests enforce is unchanged: an
 * admin-added product is never removed from storage, and re-seeding can only
 * add, never overwrite.
 *
 * If one of these fails, do NOT loosen the test. It is telling you the change
 * you are making can destroy the owner's data.
 */

const ROOT = process.cwd();

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function read(rel: string): string {
  return stripComments(readFileSync(path.join(ROOT, rel), "utf8"));
}

test("catalogue.ts never removes an entry from the stored array", () => {
  const src = read(path.join("src", "lib", "data", "catalogue.ts"));
  assert.doesNotMatch(src, /\.splice\(/, "no splice — entries are never removed from the array");
  assert.doesNotMatch(
    src,
    /entries\.filter\([^)]*\)(?![\s\S]{0,80}map\()/,
    "a filtered (shrunk) array must never be what gets written back to storage " +
      "(filter() is fine only for read-side views like listAdminProducts)",
  );
});

test("blobClient.ts has no delete function at all", () => {
  const src = read(path.join("src", "lib", "data", "blobClient.ts"));
  assert.doesNotMatch(src, /export\s+(async\s+)?function\s+delete/i);
  assert.doesNotMatch(src, /method:\s*["']DELETE["']/i);
});

test("removal is a soft delete and can be undone", () => {
  const catalogue = read(path.join("src", "lib", "data", "catalogue.ts"));

  assert.match(catalogue, /deleted_at:\s*now/i, "removal must stamp deleted_at, not remove the entry");
  assert.match(catalogue, /deleted_at:\s*null/, "restore must clear deleted_at");
  assert.doesNotMatch(catalogue, /\bfetch\([^)]*DELETE/i, "the catalogue layer must issue no HTTP DELETE");

  const route = read(path.join("src", "app", "api", "admin", "products", "[id]", "route.ts"));
  assert.match(
    route,
    /export async function POST/,
    "A removed product must be restorable — the route needs a restore handler.",
  );
});

test("seeding and restoring a product are insert-only", () => {
  const catalogue = read(path.join("src", "lib", "data", "catalogue.ts"));
  assert.match(
    catalogue,
    /knownSlugs\.has\(e\.slug\)|!knownSlugs\.has/,
    "expected the insert-only slug-collision guard inside restoreCatalogueEntries",
  );

  for (const rel of [
    path.join("src", "lib", "data", "backup.ts"),
    path.join("scripts", "seed-db.ts"),
  ]) {
    assert.match(
      read(rel),
      /restoreCatalogueEntries/,
      `${rel}: must go through the insert-only restoreCatalogueEntries path, not write products directly`,
    );
  }

  const seedRoute = read(path.join("src", "app", "api", "admin", "seed", "route.ts"));
  assert.match(
    seedRoute,
    /restoreCatalogueEntries/,
    "the seed route must go through the same insert-only path as restore, not write products directly",
  );
});

test("the storefront falls back to the shipped snapshot, never to fake demo data", () => {
  const storefront = read(path.join("src", "lib", "data", "products.ts"));
  assert.ok(
    !storefront.includes("mock/products"),
    "the demo catalogue must not be importable by the storefront",
  );
  assert.match(
    storefront,
    /CATALOGUE_SNAPSHOT/,
    "the shipped snapshot must remain the fallback of last resort",
  );

  const snapshot = JSON.parse(
    read(path.join("src", "lib", "data", "catalogueSnapshot.json")),
  ) as { slug: string; deletedAt?: string | null }[];
  assert.ok(snapshot.length > 0, "the shipped catalogue must not be empty.");
});

test("the admin product list filters out soft-deleted products by default", () => {
  const catalogue = read(path.join("src", "lib", "data", "catalogue.ts"));
  assert.match(
    catalogue,
    /deleted_at\s*===\s*null/,
    "listAdminProducts/getAdminProduct must filter live products by deleted_at",
  );
});

test("admin changes are written to an append-only audit trail", () => {
  const audit = read(path.join("src", "lib", "data", "adminAudit.ts"));
  // Append-only here means: no function in this file updates or removes a
  // blob once written — every write is a brand-new, unique pathname.
  assert.doesNotMatch(audit, /overwrite:\s*true/, "audit entries must never be overwritten");
  assert.match(audit, /putJSON\(`\$\{AUDIT_PREFIX\}/, "each entry must get its own unique pathname");

  const catalogue = read(path.join("src", "lib", "data", "catalogue.ts"));
  for (const action of ["product.delete", "product.restore", "product.update", "product.create"]) {
    assert.ok(catalogue.includes(action), `The catalogue layer must record a ${action} audit entry.`);
  }
});

test("no Postgres remains anywhere in the runtime code path", () => {
  assert.ok(!existsSync(path.join(ROOT, "src", "lib", "db")), "src/lib/db (the pg client) must be gone");
  assert.ok(!existsSync(path.join(ROOT, "db")), "db/ (SQL schema and migrations) must be gone");
});
