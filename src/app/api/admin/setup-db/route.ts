import { NextResponse } from "next/server";
import { isDatabaseConfigured, runScript, query } from "@/lib/db/client";
import { SETUP_SQL } from "@/lib/db/setupSql";

/**
 * Creates the tables and installs the six protections, from inside the app.
 *
 * A fresh deployment has a connection string but an empty database, and the
 * host's SQL console is read-only — so there was no way to create the schema
 * without a Postgres client and the credentials. Authentication is the admin
 * password, enforced by middleware on /api/admin/*.
 *
 * Idempotent and non-destructive: every statement is IF NOT EXISTS / OR
 * REPLACE, and nothing drops or empties a table. Safe on a live database —
 * re-running it leaves existing products untouched.
 */
export const dynamic = "force-dynamic";

const PROTECTIONS = [
  "products_no_hard_delete",
  "products_no_truncate",
  "orders_no_hard_delete",
  "orders_no_truncate",
  "admin_audit_append_only",
  "admin_audit_no_truncate",
];

export async function POST(): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "No database connection string is configured." },
      { status: 503 },
    );
  }

  try {
    await runScript(SETUP_SQL);
  } catch (err) {
    console.error("[admin/setup-db] script failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not set up the database." },
      { status: 500 },
    );
  }

  // Report what actually took, rather than assuming the script did its job.
  const rows = await query<{ name: string }>(
    "select tgname as name from pg_trigger where tgname = any($1)",
    [PROTECTIONS],
  );
  const installed = rows.length;

  return NextResponse.json(
    {
      ok: installed === PROTECTIONS.length,
      protections: installed,
      expected: PROTECTIONS.length,
      missing: PROTECTIONS.filter((p) => !rows.some((r) => r.name === p)),
    },
    { status: installed === PROTECTIONS.length ? 200 : 500 },
  );
}
