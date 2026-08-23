import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SETUP_SQL } from "@/lib/db/setupSql";

/**
 * The app ships an embedded copy of the schema so Admin can create the tables
 * on a fresh deployment. An embedded copy can drift from the real files, and a
 * drifted copy would quietly create the wrong database — so pin it here.
 * Regenerate with `npm run gen:setup-sql` after editing either .sql file.
 */
test("the embedded setup script matches the files under db/", () => {
  const schema = readFileSync("db/schema.sql", "utf8");
  const migration = readFileSync("db/migrations/20260823-product-data-safety.sql", "utf8");
  assert.equal(
    SETUP_SQL,
    `${schema}\n${migration}`,
    "setupSql.ts is out of date — run `npm run gen:setup-sql`",
  );
});

test("it installs all six protections", () => {
  for (const trigger of [
    "products_no_hard_delete",
    "products_no_truncate",
    "orders_no_hard_delete",
    "orders_no_truncate",
    "admin_audit_append_only",
    "admin_audit_no_truncate",
  ]) {
    assert.ok(SETUP_SQL.includes(trigger), `${trigger} missing from the setup script`);
  }
});

test("it never drops or empties anything", () => {
  // Anchored to the start of a statement: the script legitimately contains
  // "before truncate on public.products" as a trigger definition, which is the
  // opposite of a TRUNCATE — it is what blocks one.
  for (const forbidden of [
    /^\s*drop\s+table\b/im,
    /^\s*truncate\b/im,
    /^\s*delete\s+from\b/im,
  ]) {
    assert.ok(!forbidden.test(SETUP_SQL), `setup script contains ${forbidden}`);
  }
});
