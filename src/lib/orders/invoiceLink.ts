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

/**
 * Whether invoice links can be signed at all.
 *
 * `appSecret()` throws in production when APP_SECRET is unset — deliberately,
 * because signing with a public constant would leave every customer's address
 * reachable by guessing order ids. But that means callers on a rendering path
 * have to ask first: a thrown error inside the order confirmation page would
 * turn into a 500 for a customer who has just paid.
 */
export function invoiceSigningAvailable(): boolean {
  try {
    appSecret();
    return true;
  } catch {
    return false;
  }
}

export function invoiceToken(orderId: string): string {
  return createHmac("sha256", appSecret()).update(orderId).digest("hex").slice(0, 32);
}

/**
 * Constant-time check so the token can't be recovered by timing the response.
 * Returns false rather than throwing when signing isn't configured — an
 * unverifiable request is simply not authorised.
 */
export function verifyInvoiceToken(orderId: string, token: string | null): boolean {
  if (!token || !invoiceSigningAvailable()) return false;
  const expected = Buffer.from(invoiceToken(orderId));
  const actual = Buffer.from(token);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/**
 * Signed, same-origin path — for links rendered by our own pages.
 * Returns undefined when signing isn't configured, so the caller hides the
 * download link instead of failing the page.
 */
export function invoicePath(orderId: string): string | undefined {
  if (!invoiceSigningAvailable()) return undefined;
  return `/api/orders/${encodeURIComponent(orderId)}/invoice?t=${invoiceToken(orderId)}`;
}

/** Absolute, signed URL to an order's PDF. For email and WhatsApp. */
export function invoiceUrl(orderId: string): string {
  const base = SITE.url.replace(/\/+$/, "");
  return `${base}/api/orders/${encodeURIComponent(orderId)}/invoice?t=${invoiceToken(orderId)}`;
}
