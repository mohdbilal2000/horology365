import { NextResponse } from "next/server";
import { queryOne, isDatabaseConfigured } from "@/lib/db/client";
import { EMAIL_ENABLED, WHATSAPP_ENABLED } from "@/lib/config";

/**
 * Deployment health check.
 *
 * Exists because verifying a deployment previously meant inferring
 * configuration from side effects — counting products in the sitemap, or
 * spotting which branch an error page rendered. That is slow and easy to read
 * wrong. This answers the question directly.
 *
 * Deliberately returns only booleans and counts. No connection string, no key,
 * no customer data — nothing here is worth anything to someone who finds it,
 * and everything here is needed to confirm a deploy is wired up.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Check {
  ok: boolean;
  detail: string;
}

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, Check> = {};

  // ── Database ──
  if (!isDatabaseConfigured()) {
    checks.database = {
      ok: false,
      detail: "DATABASE_URL is not set — the site is serving the static catalogue, the admin cannot save, and orders are not being stored.",
    };
  } else {
    try {
      const row = await queryOne<{ products: string }>(
        "select count(*)::text as products from products where deleted_at is null",
      );
      checks.database = {
        ok: true,
        detail: `connected · ${row?.products ?? "?"} live products`,
      };
    } catch (err) {
      checks.database = {
        ok: false,
        detail: `DATABASE_URL is set but the query failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      };
    }
  }

  // ── Data-safety migration ──
  // Without these the app-level protections still hold, but the database
  // backstop that stops a bug erasing products does not exist yet.
  if (checks.database.ok) {
    try {
      const row = await queryOne<{ has_column: boolean; triggers: string }>(
        `select
           exists (
             select 1 from information_schema.columns
              where table_name = 'products' and column_name = 'deleted_at'
           ) as has_column,
           (select count(*)::text from pg_trigger
             where tgname in ('products_no_hard_delete','orders_no_hard_delete','admin_audit_append_only')
           ) as triggers`,
      );
      const triggers = Number(row?.triggers ?? 0);
      const ok = Boolean(row?.has_column) && triggers === 3;
      checks.dataSafety = {
        ok,
        detail: ok
          ? "soft delete + all 3 protection triggers active"
          : `incomplete (deleted_at: ${row?.has_column ? "yes" : "no"}, triggers: ${triggers}/3) — run db/migrations/20260823-product-data-safety.sql`,
      };
    } catch (err) {
      checks.dataSafety = {
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // ── Order delivery ──
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

  // The database is the only check that makes the site genuinely unhealthy.
  // The rest are degraded-but-serving, so they must not fail a platform probe.
  const healthy = checks.database.ok;

  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
