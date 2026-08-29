import { NextResponse } from "next/server";
import { blobConfigured, listPrefix } from "@/lib/data/blobClient";
import { readCatalogue } from "@/lib/data/catalogue";
import { backupHealth, listBackups } from "@/lib/data/backupStore";
import { EMAIL_ENABLED, WHATSAPP_ENABLED } from "@/lib/config";

/**
 * Deployment health check.
 *
 * Exists because verifying a deployment previously meant inferring
 * configuration from side effects — counting products in the sitemap, or
 * spotting which branch an error page rendered. That is slow and easy to read
 * wrong. This answers the question directly.
 *
 * Deliberately returns only booleans and counts. No token, no secret, no
 * customer data — nothing here is worth anything to someone who finds it,
 * and everything here is needed to confirm a deploy is wired up.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Check {
  ok: boolean;
  detail: string;
}

function bytesToSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, Check> = {};

  // ── Product storage ──
  if (!blobConfigured()) {
    checks.storage = {
      ok: false,
      detail: "BLOB_READ_WRITE_TOKEN not set — the site is serving the shipped catalogue snapshot, the admin cannot save, and orders are not being stored.",
    };
  } else {
    try {
      const { entries } = await readCatalogue();
      const live = entries.filter((e) => e.deleted_at === null).length;
      checks.storage = { ok: true, detail: `connected · ${live} live products` };
    } catch (err) {
      checks.storage = {
        ok: false,
        detail: `BLOB_READ_WRITE_TOKEN is set but the read failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }
  }

  // ── Data safety ──
  // There's no trigger to check here — the guarantee is structural: nothing
  // in catalogue.ts ever removes an entry from the array, and every write
  // lands as a brand-new, immutable history file before the small "current"
  // pointer is ever touched. What's worth reporting is how much of that
  // history actually exists, as a sanity check that writes are landing.
  if (checks.storage.ok) {
    try {
      const history = await listPrefix("store/catalogue/history/");
      checks.dataSafety = {
        ok: true,
        detail: `soft delete only, no hard-delete code path · ${history.length} catalogue version(s) retained`,
      };
    } catch (err) {
      checks.dataSafety = { ok: false, detail: err instanceof Error ? err.message : String(err) };
    }
  }

  // ── Storage size ──
  // Read before every migration to a new Vercel account: shows whether the
  // store is actually light enough to move without surprises.
  if (checks.storage.ok) {
    try {
      const [catalogueHistory, images, orders] = await Promise.all([
        listPrefix("store/catalogue/history/"),
        listPrefix("store/images/"),
        listPrefix("store/orders/"),
      ]);
      const totalBytes = [...catalogueHistory, ...images, ...orders].reduce((n, b) => n + b.size, 0);
      checks.storageSize = {
        ok: true,
        detail: `${bytesToSize(totalBytes)} total · ${images.length} photo(s) · ${catalogueHistory.length} catalogue version(s) · ${orders.length} order file(s)`,
      };
    } catch (err) {
      checks.storageSize = { ok: true, detail: `Could not measure size: ${err instanceof Error ? err.message : String(err)}` };
    }
  }

  // ── Backups ──
  // Reported whether or not storage is reachable: "no backup is running" is
  // exactly the thing that must never again be invisible.
  try {
    checks.backups = backupHealth(await listBackups());
  } catch (err) {
    checks.backups = {
      ok: false,
      detail: `Could not read the backup store: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  checks.invoiceSigning = {
    ok: Boolean(process.env.APP_SECRET),
    detail: process.env.APP_SECRET
      ? "APP_SECRET set — invoice links are signed"
      : "APP_SECRET missing — customers cannot download or be sent an invoice (the confirmation page still works; the link is hidden)",
  };
  checks.email = {
    ok: EMAIL_ENABLED,
    detail: EMAIL_ENABLED
      ? "RESEND_API_KEY set — invoices are emailed"
      : "RESEND_API_KEY missing — no invoice emails are sent",
  };
  checks.whatsapp = {
    ok: WHATSAPP_ENABLED,
    detail: WHATSAPP_ENABLED
      ? "Meta credentials set — invoices are sent on WhatsApp"
      : "WHATSAPP_TOKEN / WHATSAPP_PHONE_ID missing — falling back to a wa.me link",
  };

  // Storage is the only check that makes the site genuinely unhealthy. The
  // rest are degraded-but-serving, so they must not fail a platform probe.
  const healthy = checks.storage.ok && checks.backups.ok;

  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
