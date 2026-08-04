import { NextResponse } from "next/server";
import { validateCheckout, validateCartItems } from "@/lib/validation";
import { cartSubtotal, cartShipping } from "@/lib/cartMath";
import { generateOrderId } from "@/lib/utils";
import { COD_ENABLED, UPI_ENABLED, CARD_ENABLED } from "@/lib/config";
import { createOrder } from "@/lib/data/orders";
import { isSupabaseAdminConfigured } from "@/lib/supabase/server";
import type { CartItem, CheckoutDetails, Order } from "@/lib/types";

/**
 * Server-side validated order creation, persisted to Supabase when
 * configured (falls back to an unpersisted response otherwise, so checkout
 * still completes before the backend is set up — see /order/[id]).
 *
 * Fail closed on payment method: an order is only acknowledged after
 * validation passes, and each method is rejected until it's actually enabled
 * (UPI/COD via NEXT_PUBLIC_PAYMENT_MODE, card via real Razorpay keys).
 */
export async function POST(request: Request): Promise<NextResponse> {
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
    return NextResponse.json(
      { error: "Your cart is empty or invalid." },
      { status: 400 },
    );
  }

  const { ok, errors } = validateCheckout(details ?? {});
  if (!ok || !details) {
    return NextResponse.json({ error: "Validation failed.", errors }, { status: 422 });
  }

  const method = details.paymentMethod;
  if (method === "cod" && !COD_ENABLED) {
    return NextResponse.json(
      { error: "Cash on delivery is currently unavailable." },
      { status: 409 },
    );
  }
  if (method === "upi" && !UPI_ENABLED) {
    return NextResponse.json(
      { error: "UPI payments are coming soon. Please choose Cash on Delivery." },
      { status: 409 },
    );
  }
  if (method === "card" && !CARD_ENABLED) {
    return NextResponse.json(
      { error: "Card payments aren't available yet." },
      { status: 409 },
    );
  }

  const typedItems = items as CartItem[];
  const subtotal = cartSubtotal(typedItems);
  const shipping = cartShipping(subtotal);

  const order: Order = {
    id: generateOrderId(),
    items: typedItems,
    details: details as CheckoutDetails,
    subtotal,
    shipping,
    total: subtotal + shipping,
    // COD/UPI orders start "pending" until delivered/reconciled; card orders
    // are created "pending" too and flipped to "paid" once Razorpay confirms.
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const persisted = await createOrder(order);
  if (!persisted.ok && isSupabaseAdminConfigured()) {
    // Supabase IS configured but the write failed — don't silently lose the
    // order without a trace. Still return it to the customer (fail open).
    console.error("[api/orders] failed to persist order:", persisted.error);
  }

  return NextResponse.json({ order }, { status: 201 });
}
