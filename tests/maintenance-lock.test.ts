import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAINTENANCE_MODE, MAINTENANCE_MESSAGE } from "@/lib/maintenance";

/**
 * The shop is locked: it serves the catalogue shipped with the site, and no
 * admin route may change a product. This exists because the database went over
 * its bandwidth allowance and stopped answering, and the storefront then served
 * a demo catalogue to real customers. The lock must not depend on the database
 * staying down — if its allowance resets, writes would quietly work again.
 */

const ADMIN_WRITE_ROUTES = [
  ["src/app/api/admin/products/route.ts", ["POST"]],
  ["src/app/api/admin/products/[id]/route.ts", ["PUT", "PATCH", "DELETE", "POST"]],
  ["src/app/api/admin/seed/route.ts", ["POST"]],
  ["src/app/api/admin/restore/route.ts", ["POST"]],
  ["src/app/api/admin/setup-db/route.ts", ["POST"]],
] as const;

test("maintenance mode is on", () => {
  assert.equal(MAINTENANCE_MODE, true);
  assert.match(MAINTENANCE_MESSAGE, /temporarily disabled/i);
});

test("every admin write refuses before it can reach the database", () => {
  for (const [file, verbs] of ADMIN_WRITE_ROUTES) {
    const src = readFileSync(file, "utf8");
    for (const verb of verbs) {
      const body = src.slice(src.indexOf(`export async function ${verb}(`));
      const guard = body.indexOf("if (MAINTENANCE_MODE) return maintenanceResponse();");
      assert.ok(guard > 0, `${file} ${verb} has no maintenance guard`);
      // It must be the first thing the handler does — a guard placed after a
      // database call would still spend the write.
      const firstStatement = body.indexOf("{") + 1;
      assert.ok(
        guard - firstStatement < 120,
        `${file} ${verb} runs code before the maintenance guard`,
      );
    }
  }
});

test("the storefront never queries a database", () => {
  const src = readFileSync("src/lib/data/products.ts", "utf8");
  for (const forbidden of ["await query(", "await query<", "isDatabaseConfigured", "db/client"]) {
    assert.ok(!src.includes(forbidden), `products.ts still references ${forbidden}`);
  }
});

test("the demo catalogue is unreachable from the storefront", () => {
  const src = readFileSync("src/lib/data/products.ts", "utf8");
  assert.ok(
    !src.includes("mock/products"),
    "the demo catalogue must not be importable by the storefront",
  );
});
