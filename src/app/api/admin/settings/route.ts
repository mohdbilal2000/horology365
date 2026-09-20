import { NextResponse } from "next/server";
import { blobConfigured } from "@/lib/data/blobClient";
import {
  readSettings,
  writeSettings,
  toAdminView,
  type SettingsPatch,
} from "@/lib/data/settings";

/**
 * Admin read/update of store settings. Authentication is handled by middleware.
 * GET works even without Blob (it returns the shipped defaults); PUT needs Blob
 * to have somewhere to persist. The WhatsApp token is never returned in full —
 * toAdminView masks it to its last four characters.
 */
export async function GET(): Promise<NextResponse> {
  const settings = await readSettings();
  return NextResponse.json(
    { settings: toAdminView(settings) },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function PUT(request: Request): Promise<NextResponse> {
  if (!blobConfigured()) {
    return NextResponse.json(
      { error: "Settings storage isn't configured yet." },
      { status: 503 },
    );
  }

  let body: SettingsPatch;
  try {
    body = (await request.json()) as SettingsPatch;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const next = await writeSettings(body);
    return NextResponse.json({ settings: toAdminView(next) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save settings." },
      { status: 500 },
    );
  }
}
