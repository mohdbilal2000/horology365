import { NextResponse } from "next/server";
import { MAINTENANCE_MODE, maintenanceResponse } from "@/lib/maintenance";
import { blobConfigured } from "@/lib/data/blobClient";
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
  // Maintenance mode — see src/lib/maintenance.ts.
  if (MAINTENANCE_MODE) return maintenanceResponse();

  if (!blobConfigured()) {
    return NextResponse.json({ error: "Product storage isn't configured yet." }, { status: 503 });
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
