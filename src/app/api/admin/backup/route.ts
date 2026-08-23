import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { buildBackup } from "@/lib/data/backup";

/** Downloads a complete snapshot as a JSON file. Admin-gated by middleware. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "No database is configured." }, { status: 503 });
  }
  try {
    const backup = await buildBackup();
    const date = backup.takenAt.slice(0, 10);
    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="horology365-backup-${date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Backup failed." },
      { status: 500 },
    );
  }
}
