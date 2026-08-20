import { NextResponse } from "next/server";
import { CARD_ENABLED } from "@/lib/config";
import { isRazorpayConfigured, verifyRazorpaySignature } from "@/lib/razorpay";
import { markOrderPaidViaRazorpay } from "@/lib/data/orders";

export async function POST(request: Request): Promise<NextResponse> {
  if (!CARD_ENABLED || !isRazorpayConfigured()) {
    return NextResponse.json({ error: "Card payments aren't available yet." }, { status: 404 });
  }

  let body: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment fields." }, { status: 422 });
  }

  const valid = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!valid) {
    return NextResponse.json({ error: "Signature verification failed." }, { status: 400 });
  }

  const ok = await markOrderPaidViaRazorpay(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!ok) {
    return NextResponse.json({ error: "Could not update the order." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
