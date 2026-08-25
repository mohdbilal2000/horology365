import { NextResponse } from "next/server";

/**
 * Maintenance mode: the shop serves its catalogue from the file shipped with
 * the site, and no product can be created, edited, removed or restored.
 *
 * Deliberately a code-level block rather than a consequence of the database
 * being unreachable. The database went over its bandwidth allowance and stopped
 * answering; if that allowance resets, writes would silently become possible
 * again while there is still no working backup and no confirmed source of
 * truth. The lock has to hold regardless of what the database does.
 *
 * Lifting it is one line: set MAINTENANCE_MODE to false, which restores every
 * admin write. The storefront is separate — see getAllProducts.
 *
 * Typed as `boolean` rather than left as the literal `true` on purpose: a
 * literal would make every handler body below the guard unreachable, and
 * TypeScript stops checking unreachable code. The implementations must keep
 * being typechecked while they are switched off, or they rot silently and
 * fail the day the lock is lifted.
 */
export const MAINTENANCE_MODE: boolean = true;

export const MAINTENANCE_MESSAGE =
  "Maintenance mode: product changes are temporarily disabled.";

export function maintenanceResponse(): NextResponse {
  return NextResponse.json({ error: MAINTENANCE_MESSAGE }, { status: 503 });
}
