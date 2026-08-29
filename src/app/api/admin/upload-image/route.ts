import { NextResponse } from "next/server";
import { MAINTENANCE_MODE, maintenanceResponse } from "@/lib/maintenance";
import { blobConfigured } from "@/lib/data/blobClient";
import { uploadImageBytes } from "@/lib/data/images";

/**
 * Uploads one product photo straight to Blob and returns its URL — called by
 * the admin product form instead of embedding the photo as a data URL.
 * Authentication is handled by middleware.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request): Promise<NextResponse> {
  // Maintenance mode — see src/lib/maintenance.ts.
  if (MAINTENANCE_MODE) return maintenanceResponse();

  if (!blobConfigured()) {
    return NextResponse.json({ error: "Photo storage isn't configured yet." }, { status: 503 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Only image uploads are accepted." }, { status: 415 });
  }

  const hint = new URL(request.url).searchParams.get("hint") ?? "product";

  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length === 0) {
    return NextResponse.json({ error: "Empty upload." }, { status: 400 });
  }
  if (bytes.length > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is too large (max 8MB)." }, { status: 413 });
  }

  try {
    const url = await uploadImageBytes(bytes, contentType, hint);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[admin/upload-image] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 500 },
    );
  }
}
