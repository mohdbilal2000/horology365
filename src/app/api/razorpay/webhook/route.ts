import { NextResponse } from "next/server";
import { isRazorpayConfigured, verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import { markOrderPaidViaRazorpay } from "@/lib/data/orders";

/**
 * Backup confirmation path for the browser-closed-before-callback case —
 * Razorpay calls this directly once a payment is captured, independent of
 * the client-side /api/razorpay/verify call. Whichever arrives first wins;
 * the other is a harmless no-op status update (see markOrderPaidViaRazorpay).
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!isRazorpayConfigured() || !process.env.RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Not configured." }, { status: 404 });
  }

  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // HMAC must cover the exact bytes Razorpay signed — read raw text, not JSON.
  const rawBody = await request.text();
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  if (event.event === "payment.captured") {
    const payment = event.payload?.payment?.entity;
    if (payment?.order_id && payment?.id) {
      await markOrderPaidViaRazorpay(payment.order_id, payment.id, signature);
    }
  }

  return NextResponse.json({ ok: true });
}
