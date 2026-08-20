import { NextResponse } from "next/server";
import { getCatalogStatus } from "@/lib/data/catalogStatus";

/**
 * Public health check: open /api/health to see, in one line, whether the
 * storefront is serving live admin data or the static demo catalogue.
 *
 * Deliberately public and unauthenticated so it can be checked from a phone
 * without logging in. It reports no credentials — not the Supabase URL, not
 * any key — only whether they are present and whether the catalogue query
 * succeeded.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const status = await getCatalogStatus();
  const ok = status.source === "database";

  return NextResponse.json(
    {
      ok,
      summary: ok
        ? `Live: serving ${status.databaseProductCount} product(s) from the database.`
        : "DEGRADED: the database is unreachable, so the site is showing the built-in demo catalogue. Admin-added products are hidden (not deleted) until it is reachable again.",
      ...status,
    },
    // 503 so uptime monitors alarm on the fallback instead of seeing a
    // healthy-looking 200 while the real catalogue is missing.
    { status: ok ? 200 : 503 },
  );
}
