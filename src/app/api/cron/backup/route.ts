import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/client";
import { buildBackup } from "@/lib/data/backup";
import { ORDER_NOTIFY, EMAIL_ENABLED, SITE } from "@/lib/config";

/**
 * Scheduled off-site backup: emails a full snapshot to the store inbox.
 *
 * A backup the owner has to remember to take is one he will stop taking. This
 * puts a copy somewhere the database cannot reach — his mailbox — without
 * adding another vendor, since the order emails already go through Resend.
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

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "No database is configured." }, { status: 503 });
  }
  if (!EMAIL_ENABLED) {
    return NextResponse.json(
      { error: "RESEND_API_KEY is not set, so the backup has nowhere to go." },
      { status: 503 },
    );
  }

  try {
    const backup = await buildBackup();
    const date = backup.takenAt.slice(0, 10);
    const json = JSON.stringify(backup, null, 2);

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
    return NextResponse.json({ ok: true, counts: backup.counts, sentTo: ORDER_NOTIFY.storeEmail });
  } catch (err) {
    console.error("[cron/backup] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Backup failed." },
      { status: 500 },
    );
  }
}
