import "server-only";
import crypto from "node:crypto";
import Razorpay from "razorpay";

/**
 * Inert until both keys are set — no free way exists to process real
 * credit/debit cards (unlike UPI, which is fee-free for Indian merchants),
 * so this only activates once the business owner deliberately signs up for
 * Razorpay and adds real keys. See CARD_ENABLED in src/lib/config.ts for the
 * matching UI-visibility flag.
 */
export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

let client: Razorpay | null | undefined;

export function getRazorpayClient(): Razorpay | null {
  if (client !== undefined) return client;
  client = isRazorpayConfigured()
    ? new Razorpay({
        key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      })
    : null;
  return client;
}

/** Verifies the Checkout.js client callback signature (order|payment id, HMAC-SHA256). */
export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Verifies a Razorpay webhook signature over the raw request body. */
export function verifyRazorpayWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
