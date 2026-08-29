import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MAINTENANCE_MODE, MAINTENANCE_MESSAGE } from "@/lib/maintenance";

/**
 * The maintenance lock existed because the previous Postgres database went
 * over its bandwidth allowance and stopped answering, and the storefront then
 * served a demo catalogue to real customers. The backend has since moved off
 * Postgres entirely onto Vercel Blob, which has no such allowance to exceed —
 * so the lock is off and every admin write handler is reachable again.
 *
 * What still has to hold, permanently, regardless of whether the lock is ever
 * switched back on: every write handler still checks it first (so flipping it
 * back on is genuinely "one line", not "one line plus finding every place
 * that forgot to check it"), and the storefront still never depends on live
 * infrastructure it can't fall back from.
 */

const ADMIN_WRITE_ROUTES = [
  ["src/app/api/admin/products/route.ts", ["POST"]],
  ["src/app/api/admin/products/[id]/route.ts", ["PUT", "PATCH", "DELETE", "POST"]],
  ["src/app/api/admin/seed/route.ts", ["POST"]],
  ["src/app/api/admin/restore/route.ts", ["POST"]],
  ["src/app/api/admin/upload-image/route.ts", ["POST"]],
] as const;

test("maintenance mode is off", () => {
  assert.equal(MAINTENANCE_MODE, false);
  assert.match(MAINTENANCE_MESSAGE, /temporarily disabled/i);
});

test("every admin write checks the maintenance guard first, even switched off", () => {
  for (const [file, verbs] of ADMIN_WRITE_ROUTES) {
    const src = readFileSync(file, "utf8");
    for (const verb of verbs) {
      const body = src.slice(src.indexOf(`export async function ${verb}(`));
      const guard = body.indexOf("if (MAINTENANCE_MODE) return maintenanceResponse();");
      assert.ok(guard > 0, `${file} ${verb} has no maintenance guard`);
      // It must be the first thing the handler does — a guard placed after a
      // write call would still spend the write once the lock is back on.
      const firstStatement = body.indexOf("{") + 1;
      assert.ok(
        guard - firstStatement < 120,
        `${file} ${verb} runs code before the maintenance guard`,
      );
    }
  }
});

test("the storefront falls back to the shipped snapshot, never to a hard failure or fake data", () => {
  const src = readFileSync("src/lib/data/products.ts", "utf8");
  assert.ok(src.includes("CATALOGUE_SNAPSHOT"), "products.ts must keep the shipped-snapshot fallback");
  assert.ok(
    !src.includes("mock/products"),
    "the demo catalogue must not be importable by the storefront",
  );
});
