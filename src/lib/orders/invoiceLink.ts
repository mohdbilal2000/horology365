import { createHmac, timingSafeEqual } from "node:crypto";
import { appSecret, SITE } from "@/lib/config";

/**
 * Invoice PDFs are fetched by Meta's servers (to attach the document to a
 * WhatsApp message) and opened by customers from an email, so the URL has to be
 * publicly reachable — it cannot sit behind a login.
 *
 * Order ids alone are not enough entropy to be the only protection, so every
 * link carries an HMAC of the order id. Without a valid token the route 404s,
 * which keeps customer addresses and phone numbers from being enumerable.
 */

export function invoiceToken(orderId: string): string {
  return createHmac("sha256", appSecret()).update(orderId).digest("hex").slice(0, 32);
}

/** Constant-time check so the token can't be recovered by timing the response. */
export function verifyInvoiceToken(orderId: string, token: string | null): boolean {
  if (!token) return false;
  const expected = Buffer.from(invoiceToken(orderId));
  const actual = Buffer.from(token);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** Absolute, signed URL to an order's PDF. */
export function invoiceUrl(orderId: string): string {
  const base = SITE.url.replace(/\/+$/, "");
  return `${base}/api/orders/${encodeURIComponent(orderId)}/invoice?t=${invoiceToken(orderId)}`;
}
