import { NextResponse } from "next/server";
import { queryOne, isDatabaseConfigured } from "@/lib/db/client";
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
      detail: "No database connection string found (DATABASE_URL or POSTGRES_URL) — the site is serving the static catalogue, the admin cannot save, and orders are not being stored.",
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

  // ── Database size ──
  // Read before every migration to a new host or provider: shows whether the
  // database is actually light enough to move without surprises (a slow
  // pg_dump, a storage-tier limit) rather than assuming it from row counts.
  if (checks.database.ok) {
    try {
      const row = await queryOne<{ total: string; products: string; audit: string }>(
        `select
           pg_size_pretty(pg_database_size(current_database())) as total,
           pg_size_pretty(pg_total_relation_size('products')) as products,
           pg_size_pretty(pg_total_relation_size('admin_audit')) as audit`,
      );
      checks.databaseSize = {
        ok: true,
        detail: `database ${row?.total ?? "?"} · products table ${row?.products ?? "?"} · admin_audit table ${row?.audit ?? "?"}`,
      };
    } catch (err) {
      checks.databaseSize = {
        ok: true,
        detail: `Could not measure size: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // ── Order delivery ──
  // ── Backups ──
  // Reported whether or not the database is reachable: "no backup is running"
  // is exactly the thing that must never again be invisible, and it is most
  // urgent precisely when the database is in trouble.
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

  // The database is the only check that makes the site genuinely unhealthy.
  // The rest are degraded-but-serving, so they must not fail a platform probe.
  // A shop with a working database but no backups is one bad day from the
  // incident this whole system exists to prevent, so it does not report "ok".
  const healthy = checks.database.ok && checks.backups.ok;

  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
