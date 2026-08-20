import { NextResponse } from "next/server";
import { validateCheckout, validateCartItems } from "@/lib/validation";
import { cartSubtotal, cartShipping } from "@/lib/cartMath";
import { generateOrderId } from "@/lib/utils";
import { CARD_ENABLED } from "@/lib/config";
import { isRazorpayConfigured, getRazorpayClient } from "@/lib/razorpay";
import { createOrder, attachRazorpayOrderId } from "@/lib/data/orders";
import type { CartItem, CheckoutDetails, Order } from "@/lib/types";

export async function POST(request: Request): Promise<NextResponse> {
  if (!CARD_ENABLED || !isRazorpayConfigured()) {
    return NextResponse.json({ error: "Card payments aren't available yet." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { details, items } = (body ?? {}) as {
    details?: Partial<CheckoutDetails>;
    items?: unknown;
  };

  if (!validateCartItems(items)) {
    return NextResponse.json({ error: "Your cart is empty or invalid." }, { status: 400 });
  }
  const { ok, errors } = validateCheckout({ ...details, paymentMethod: "card" });
  if (!ok) {
    return NextResponse.json({ error: "Validation failed.", errors }, { status: 422 });
  }

  const typedItems = items as CartItem[];
  const subtotal = cartSubtotal(typedItems);
  const shipping = cartShipping(subtotal);
  const total = subtotal + shipping;

  const order: Order = {
    id: generateOrderId(),
    items: typedItems,
    details: { ...(details as CheckoutDetails), paymentMethod: "card" },
    subtotal,
    shipping,
    total,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const persisted = await createOrder(order);
  if (!persisted.ok) {
    return NextResponse.json({ error: "Could not create the order." }, { status: 500 });
  }

  const razorpay = getRazorpayClient()!;
  const razorpayOrder = await razorpay.orders.create({
    amount: total * 100, // paise
    currency: "INR",
    receipt: order.id,
  });

  await attachRazorpayOrderId(order.id, razorpayOrder.id);

  return NextResponse.json({
    orderId: order.id,
    razorpayOrderId: razorpayOrder.id,
    amount: total * 100,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}
