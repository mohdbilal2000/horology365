import { WHATSAPP, WHATSAPP_ENABLED, ORDER_NOTIFY, SITE } from "@/lib/config";
import { orderPdfFilename } from "@/lib/pdf/invoice";
import { invoiceUrl } from "@/lib/orders/invoiceLink";
import { formatINR, whatsappLink } from "@/lib/utils";
import type { Order } from "@/lib/types";

/**
 * Order delivery over the Meta WhatsApp Cloud API.
 *
 * Flow: upload the PDF once to /media, then send that media id as a document
 * message to the customer and to the store. Uploading once and reusing the id
 * is both faster and avoids Meta re-fetching the invoice URL twice.
 *
 * When WHATSAPP_TOKEN / WHATSAPP_PHONE_ID are not configured, nothing is sent
 * and we return a prefilled wa.me link instead, so the store can forward the
 * invoice by hand and the order flow still completes.
 *
 * Note on the 24-hour window: Meta only allows free-form messages to a user who
 * messaged you in the last 24h. For a first-time buyer you need an approved
 * template — set WHATSAPP_TEMPLATE_NAME and it is sent ahead of the document.
 */

const TIMEOUT_MS = 20_000;

export interface WhatsAppResult {
  sent: boolean;
  /** Numbers that received the document. */
  recipients: string[];
  /** Manual-send link, present whenever automatic delivery didn't happen. */
  fallbackLink?: string;
  skipped?: string;
  error?: string;
}

/** Normalises to the digits-only E.164 form Meta expects (no "+", no spaces). */
export function normalisePhone(raw: string, defaultCountryCode = "91"): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  // A bare Indian 10-digit mobile needs the country code prefixed.
  if (digits.length === 10) return `${defaultCountryCode}${digits}`;
  return digits.replace(/^0+/, "");
}

function api(path: string): string {
  return `https://graph.facebook.com/${WHATSAPP.apiVersion}/${path}`;
}

async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/** Uploads the invoice and returns Meta's media id. */
async function uploadPdf(pdf: Buffer, filename: string): Promise<string> {
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", "application/pdf");
  form.append(
    "file",
    new Blob([new Uint8Array(pdf)], { type: "application/pdf" }),
    filename,
  );

  const res = await withTimeout((signal) =>
    fetch(api(`${WHATSAPP.phoneNumberId}/media`), {
      method: "POST",
      signal,
      headers: { Authorization: `Bearer ${WHATSAPP.token}` },
      body: form,
    }),
  );
  if (!res.ok) {
    throw new Error(`WhatsApp media upload failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("WhatsApp media upload returned no media id.");
  return data.id;
}

async function postMessage(payload: Record<string, unknown>): Promise<void> {
  const res = await withTimeout((signal) =>
    fetch(api(`${WHATSAPP.phoneNumberId}/messages`), {
      method: "POST",
      signal,
      headers: {
        Authorization: `Bearer ${WHATSAPP.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
    }),
  );
  if (!res.ok) {
    throw new Error(`WhatsApp send failed (${res.status}): ${await res.text()}`);
  }
}

/**
 * Sends the approved template first when one is configured. Outside the 24-hour
 * customer-service window Meta rejects the document without it, so a template
 * failure is logged but not fatal — the document attempt still runs.
 */
async function openConversation(to: string, order: Order): Promise<void> {
  if (!WHATSAPP.templateName) return;
  try {
    await postMessage({
      to,
      type: "template",
      template: {
        name: WHATSAPP.templateName,
        language: { code: WHATSAPP.templateLanguage },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: order.details.name },
              { type: "text", text: order.id },
            ],
          },
        ],
      },
    });
  } catch (err) {
    console.error("[whatsapp] template send failed (continuing to document):", err);
  }
}

async function sendDocument(
  to: string,
  mediaId: string,
  filename: string,
  caption: string,
): Promise<void> {
  await postMessage({
    to,
    type: "document",
    document: { id: mediaId, filename, caption },
  });
}

function customerCaption(order: Order): string {
  return (
    `Thanks for your order, ${order.details.name.split(" ")[0] ?? order.details.name}! ` +
    `Order ${order.id} · ${formatINR(order.total)}. Your invoice is attached.`
  );
}

function storeCaption(order: Order): string {
  return (
    `New order ${order.id}\n${order.details.name} · ${order.details.phone}\n` +
    `${formatINR(order.total)} · ${order.details.paymentMethod.toUpperCase()}` +
    `${order.details.upiReference ? ` · Ref ${order.details.upiReference}` : ""}\n` +
    `${order.details.city}, ${order.details.state} ${order.details.pincode}`
  );
}

/**
 * Delivers the invoice PDF to the customer and the store over WhatsApp.
 * Never throws — the caller reports the degraded state instead of failing the
 * order, since the order itself is already persisted by this point.
 */
export async function sendOrderWhatsApps(
  order: Order,
  pdf: Buffer,
): Promise<WhatsAppResult> {
  const customer = normalisePhone(order.details.phone);
  const store = normalisePhone(ORDER_NOTIFY.storeWhatsApp);

  // The manual link always points at the store's own number, prefilled with the
  // order summary and a signed link to the PDF.
  const fallbackLink = whatsappLink(
    store,
    `New order ${order.id} — ${order.details.name} — ${formatINR(order.total)}\n` +
      `Invoice: ${invoiceUrl(order.id)}`,
  );

  if (!WHATSAPP_ENABLED) {
    return {
      sent: false,
      recipients: [],
      fallbackLink,
      skipped:
        "WHATSAPP_TOKEN / WHATSAPP_PHONE_ID are not set — using a wa.me link instead.",
    };
  }

  const filename = orderPdfFilename(order);
  let mediaId: string;
  try {
    mediaId = await uploadPdf(pdf, filename);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[whatsapp] upload failed:", error);
    return { sent: false, recipients: [], fallbackLink, error };
  }

  const targets: Array<{ to: string; caption: string; template: boolean }> = [];
  if (customer) targets.push({ to: customer, caption: customerCaption(order), template: true });
  // Don't message the store twice if the buyer happens to be the store number.
  if (store && store !== customer) {
    targets.push({ to: store, caption: storeCaption(order), template: false });
  }

  const results = await Promise.allSettled(
    targets.map(async (t) => {
      if (t.template) await openConversation(t.to, order);
      await sendDocument(t.to, mediaId, filename, t.caption);
    }),
  );

  const recipients: string[] = [];
  const errors: string[] = [];
  results.forEach((r, i) => {
    const to = targets[i]!.to;
    if (r.status === "fulfilled") recipients.push(to);
    else errors.push(`${to}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
  });

  if (errors.length) console.error("[whatsapp] delivery failures:", errors.join(" | "));

  return {
    sent: recipients.length > 0,
    recipients,
    // Keep the manual link available whenever anything fell short.
    fallbackLink: errors.length || !recipients.length ? fallbackLink : undefined,
    error: errors.length ? errors.join(" | ") : undefined,
  };
}

/** Exposed for the confirmation page so it can offer a manual send. */
export function manualOrderLink(order: Order): string {
  return whatsappLink(
    normalisePhone(ORDER_NOTIFY.storeWhatsApp),
    `Hi ${SITE.name} 👋 I just placed order ${order.id}. Please confirm the details.`,
  );
}
