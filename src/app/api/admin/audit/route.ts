import { NextResponse } from "next/server";
import { listAudit } from "@/lib/admin/audit";
import { isSupabaseConfigured } from "@/lib/storage/supabase";
import { journalIsDurable, journalLocation } from "@/lib/storage/journal";

/**
 * Read-only view of the admin audit trail.
 *
 * There is intentionally no write verb: entries are appended by the code that
 * performs the change, never by a client, and nothing in the app can edit or
 * delete one.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  const limitParam = Number(new URL(request.url).searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0
    ? Math.min(limitParam, 500)
    : 200;

  return NextResponse.json({
    entries: await listAudit(limit),
    storage: {
      durable: isSupabaseConfigured(),
      journalDurable: journalIsDurable(),
      journalPath: journalLocation(),
    },
  });
}
