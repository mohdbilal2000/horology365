import { createHmac, timingSafeEqual } from "node:crypto";
import { appSecret, SITE } from "@/lib/config";

/**
 * Signed invoice links.
 *
 * The invoice route has to be publicly reachable — Meta's servers fetch it to
 * attach the PDF to a WhatsApp message, and customers open it from an email —
 * so it cannot sit behind a login. Order ids alone are not enough protection:
 * they are a base36 timestamp plus four characters, so a scraper could walk
 * them and harvest names, addresses and phone numbers.
 *
 * Every link therefore carries an HMAC of the order id. Without a valid token
 * the route 404s (rather than 403s, so it reveals nothing about which ids exist).
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

/** Signed, same-origin path — for links rendered by our own pages. */
export function invoicePath(orderId: string): string {
  return `/api/orders/${encodeURIComponent(orderId)}/invoice?t=${invoiceToken(orderId)}`;
}

/** Absolute, signed URL to an order's PDF. For email and WhatsApp. */
export function invoiceUrl(orderId: string): string {
  const base = SITE.url.replace(/\/+$/, "");
  return `${base}/api/orders/${encodeURIComponent(orderId)}/invoice?t=${invoiceToken(orderId)}`;
}
