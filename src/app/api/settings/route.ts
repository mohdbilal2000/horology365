import { NextResponse } from "next/server";
import { readSettings, toPublicPayment } from "@/lib/data/settings";

/**
 * Public payment settings for the checkout page (UPI + bank display values).
 * Never includes any secret. Always succeeds — readSettings() falls back to the
 * shipped defaults when the store isn't configured or a read fails.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await readSettings();
  return NextResponse.json(toPublicPayment(settings), {
    headers: { "cache-control": "no-store" },
  });
}
