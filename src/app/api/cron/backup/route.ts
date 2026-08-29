import { NextResponse } from "next/server";
import { blobConfigured } from "@/lib/data/blobClient";
import { buildBackup } from "@/lib/data/backup";
import { ORDER_NOTIFY, EMAIL_ENABLED, SITE } from "@/lib/config";
import { putBackup, backupStoreConfigured } from "@/lib/data/backupStore";

/**
 * Scheduled snapshot: writes a dated, standalone copy to Blob and, when email
 * is configured, emails a copy too.
 *
 * The live catalogue already lives in Blob as immutable, versioned history
 * (see catalogue.ts) — so this snapshot is not protection against a bug or a
 * bad edit, that's already covered. It exists for the one thing versioned
 * history in the same Blob store can't cover: the whole Blob store itself
 * disappearing (the project deleted, the integration disconnected). The
 * emailed copy is the one that actually lands somewhere else entirely — an
 * inbox, not this Vercel account — so it's the backup that survives even
 * that. A backup the owner has to remember to take is one he will stop
 * taking, which is why this runs on its own every night rather than waiting
 * to be asked.
 *
 * Vercel signs cron requests with CRON_SECRET; unauthenticated calls are
 * refused so this can't be used to pull the whole catalogue.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Not authorised." }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // Refuse rather than expose every order to anyone who guesses the path.
    return NextResponse.json(
      { error: "CRON_SECRET is not set; refusing to run." },
      { status: 503 },
    );
  }

  if (!blobConfigured()) {
    return NextResponse.json({ error: "Product storage isn't configured yet." }, { status: 503 });
  }
  if (!backupStoreConfigured() && !EMAIL_ENABLED) {
    return NextResponse.json(
      {
        error:
          "Nowhere to put the backup: set BLOB_READ_WRITE_TOKEN (Vercel → Storage → Blob) or RESEND_API_KEY.",
      },
      { status: 503 },
    );
  }

  try {
    const backup = await buildBackup();
    const date = backup.takenAt.slice(0, 10);
    const json = JSON.stringify(backup, null, 2);
    const stored: { blobUrl?: string; emailedTo?: string } = {};

    // Blob first: it is the copy the admin banner and /api/health watch, and
    // the one that must exist even when email is not set up.
    if (backupStoreConfigured()) {
      stored.blobUrl = await putBackup(
        `backups/horology365-backup-${backup.takenAt.replace(/[:.]/g, "-")}.json`,
        json,
      );
    }

    if (!EMAIL_ENABLED) {
      return NextResponse.json({ ok: true, counts: backup.counts, ...stored });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ORDER_NOTIFY.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${SITE.name} <${ORDER_NOTIFY.fromEmail}>`,
        to: [ORDER_NOTIFY.storeEmail],
        subject: `Horology365 backup — ${date} (${backup.counts.products} products, ${backup.counts.orders} orders)`,
        text:
          `Automatic backup of the Horology365 store, taken ${backup.takenAt}.\n\n` +
          `Products: ${backup.counts.products}\nOrders: ${backup.counts.orders}\n` +
          `Change log entries: ${backup.counts.auditEntries}\n\n` +
          `Keep this email. The attached file can restore everything from the ` +
          `Backup page in the admin.`,
        attachments: [
          {
            filename: `horology365-backup-${date}.json`,
            content: Buffer.from(json).toString("base64"),
          },
        ],
      }),
    });

    if (!res.ok) {
      throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
    }
    stored.emailedTo = ORDER_NOTIFY.storeEmail;
    return NextResponse.json({ ok: true, counts: backup.counts, ...stored });
  } catch (err) {
    console.error("[cron/backup] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Backup failed." },
      { status: 500 },
    );
  }
}
