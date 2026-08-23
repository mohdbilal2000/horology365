import { ORDER_NOTIFY, EMAIL_ENABLED, SITE, CONTACT } from "@/lib/config";
import { formatINR } from "@/lib/utils";
import type { Order } from "@/lib/types";

/**
 * Order email via Resend, with the invoice PDF attached.
 *
 * Two recipients, always: the customer gets their confirmation, and the store
 * inbox gets an identical copy so there is a durable record of every order
 * outside the database.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const TIMEOUT_MS = 15_000;

export interface EmailResult {
  sent: boolean;
  /** Which addresses actually received the mail. */
  recipients: string[];
  skipped?: string;
  error?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function orderHtml(order: Order, forStore: boolean): string {
  const d = order.details;
  const rows = order.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #e7e4dc">
            <strong>${escapeHtml(i.title)}</strong><br>
            <span style="color:#6b6b73;font-size:13px">${escapeHtml(i.brandName)} &middot; Qty ${i.quantity}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #e7e4dc;text-align:right;white-space:nowrap">
            ${escapeHtml(formatINR(i.price * i.quantity))}
          </td>
        </tr>`,
    )
    .join("");

  const heading = forStore
    ? `New order ${escapeHtml(order.id)}`
    : `Thank you, ${escapeHtml(d.name.split(" ")[0] ?? d.name)}!`;
  const intro = forStore
    ? `A new order was placed on ${escapeHtml(SITE.name)}. The invoice PDF is attached.`
    : "We've received your order. Your invoice is attached to this email.";

  return `<!doctype html>
<html><body style="margin:0;background:#f7f5f0;font-family:Helvetica,Arial,sans-serif;color:#0b0b0d">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#0b0b0d;border-radius:14px;padding:22px 24px">
      <span style="color:#f7f5f0;font-size:22px;font-weight:bold">Horology</span><span style="color:#c8a55b;font-size:22px;font-weight:bold">365</span>
      <div style="color:#a9a9b0;font-size:12px;margin-top:4px">${escapeHtml(SITE.tagline)}</div>
    </div>

    <div style="background:#fff;border-radius:14px;padding:24px;margin-top:14px">
      <h1 style="margin:0 0 6px;font-size:20px">${heading}</h1>
      <p style="margin:0 0 16px;color:#4a4a52;font-size:14px">${intro}</p>
      <p style="margin:0 0 18px;font-family:monospace;background:#f2efe8;display:inline-block;padding:7px 12px;border-radius:999px;font-size:13px">${escapeHtml(order.id)}</p>

      <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>

      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:12px">
        <tr><td style="padding:3px 0;color:#6b6b73">Subtotal</td><td style="text-align:right">${escapeHtml(formatINR(order.subtotal))}</td></tr>
        <tr><td style="padding:3px 0;color:#6b6b73">Shipping</td><td style="text-align:right">${order.shipping === 0 ? "Free" : escapeHtml(formatINR(order.shipping))}</td></tr>
        <tr><td style="padding:9px 0 0;font-weight:bold;border-top:1px solid #e7e4dc">Total</td><td style="text-align:right;font-weight:bold;border-top:1px solid #e7e4dc">${escapeHtml(formatINR(order.total))}</td></tr>
      </table>

      <h2 style="font-size:14px;margin:22px 0 6px">Delivery address</h2>
      <p style="margin:0;color:#4a4a52;font-size:14px;line-height:1.55">
        ${escapeHtml(d.name)}<br>
        ${escapeHtml(d.addressLine1)}<br>
        ${d.addressLine2 ? `${escapeHtml(d.addressLine2)}<br>` : ""}
        ${escapeHtml(d.city)}, ${escapeHtml(d.state)} ${escapeHtml(d.pincode)}<br>
        ${escapeHtml(d.phone)}${d.email ? `<br>${escapeHtml(d.email)}` : ""}
      </p>

      <h2 style="font-size:14px;margin:22px 0 6px">Payment</h2>
      <p style="margin:0;color:#4a4a52;font-size:14px">
        ${d.paymentMethod === "upi" ? "UPI" : "Cash on Delivery"}
        ${d.upiReference ? ` &middot; Ref ${escapeHtml(d.upiReference)}` : ""}
        &middot; Status: <strong>${escapeHtml(order.status)}</strong>
      </p>
    </div>

    <p style="color:#8a8a92;font-size:12px;text-align:center;margin-top:16px">
      ${escapeHtml(SITE.name)} &middot; ${escapeHtml(CONTACT.phoneDisplay)}
    </p>
  </div>
</body></html>`;
}

async function sendOne(
  to: string,
  subject: string,
  html: string,
  pdf: Buffer,
  filename: string,
): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${ORDER_NOTIFY.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${SITE.name} <${ORDER_NOTIFY.fromEmail}>`,
        to: [to],
        subject,
        html,
        attachments: [{ filename, content: pdf.toString("base64") }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Emails the invoice to the customer (when they gave an address) and always to
 * the store. A failure for one recipient does not prevent the other.
 */
export async function sendOrderEmails(order: Order, pdf: Buffer): Promise<EmailResult> {
  if (!EMAIL_ENABLED) {
    return {
      sent: false,
      recipients: [],
      skipped: "RESEND_API_KEY is not set — email delivery is disabled.",
    };
  }

  const filename = `invoice-${order.id}.pdf`;
  const targets: Array<{ to: string; subject: string; html: string }> = [];

  if (order.details.email) {
    targets.push({
      to: order.details.email,
      subject: `Your Horology365 order ${order.id}`,
      html: orderHtml(order, false),
    });
  }
  targets.push({
    to: ORDER_NOTIFY.storeEmail,
    subject: `New order ${order.id} — ${order.details.name} — ${formatINR(order.total)}`,
    html: orderHtml(order, true),
  });

  const results = await Promise.allSettled(
    targets.map((t) => sendOne(t.to, t.subject, t.html, pdf, filename)),
  );

  const recipients: string[] = [];
  const errors: string[] = [];
  results.forEach((r, i) => {
    const to = targets[i]!.to;
    if (r.status === "fulfilled") recipients.push(to);
    else errors.push(`${to}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
  });

  if (errors.length) console.error("[email] delivery failures:", errors.join(" | "));

  return {
    sent: recipients.length > 0,
    recipients,
    error: errors.length ? errors.join(" | ") : undefined,
  };
}
