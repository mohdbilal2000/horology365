import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { isBackup, restoreFromBackup } from "@/lib/data/backup";
import { revalidateCatalog } from "@/lib/revalidateCatalog";

/**
 * Restores from an uploaded backup file.
 *
 * Insert-only: anything already present is left exactly as it is. Restoring
 * therefore cannot overwrite newer work, which is the whole point — a restore
 * that could clobber live data would just be a new way to lose it.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "No database is configured." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That file isn't valid JSON." }, { status: 400 });
  }

  if (!isBackup(body)) {
    return NextResponse.json(
      { error: "That doesn't look like a Horology365 backup file." },
      { status: 422 },
    );
  }

  try {
    const result = await restoreFromBackup(body);
    revalidateCatalog();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Restore failed." },
      { status: 500 },
    );
  }
}
