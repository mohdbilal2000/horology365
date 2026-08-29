import { NextResponse } from "next/server";

/**
 * Maintenance mode: when on, the shop serves its catalogue from the file
 * shipped with the site, and no product can be created, edited, removed or
 * restored.
 *
 * It was switched on because the previous Postgres database went over its
 * bandwidth allowance and stopped answering, and the storefront then served
 * a demo catalogue to real customers — the lock had to hold regardless of
 * what the database did, since its allowance resetting would have silently
 * made writes possible again with no confirmed source of truth.
 *
 * That reason no longer applies: the backend moved off Postgres entirely
 * onto Vercel Blob (see catalogue.ts, orders.ts), which has no bandwidth
 * allowance to exceed and no connection to drop. Admin writes are back on.
 *
 * Typed as `boolean` rather than left as the literal `false` on purpose: a
 * literal would make every handler body below the guard's `if` unreachable
 * in the `true` case, and TypeScript stops checking unreachable code. The
 * lock's implementation must keep being typechecked even switched off, so it
 * doesn't rot silently and fail the day it's needed again.
 */
export const MAINTENANCE_MODE: boolean = false;

export const MAINTENANCE_MESSAGE =
  "Maintenance mode: product changes are temporarily disabled.";

export function maintenanceResponse(): NextResponse {
  return NextResponse.json({ error: MAINTENANCE_MESSAGE }, { status: 503 });
}
