import { NextResponse } from "next/server";
import { validateCheckout, validateCartItems } from "@/lib/validation";
import { cartSubtotal, cartShipping } from "@/lib/cartMath";
import { generateOrderId } from "@/lib/utils";
import { COD_ENABLED, UPI_ENABLED, BANK_ENABLED, CARD_ENABLED } from "@/lib/config";
import { createOrder } from "@/lib/data/orders";
import { isDatabaseConfigured } from "@/lib/db/client";
import { dispatchOrder } from "@/lib/notify/dispatch";
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
  if (method === "bank_transfer" && !BANK_ENABLED) {
    return NextResponse.json(
      { error: "Bank transfer is currently unavailable." },
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
  if (!persisted.ok && isDatabaseConfigured()) {
    // Supabase IS configured but the write failed — don't silently lose the
    // order without a trace. Still return it to the customer (fail open).
    console.error("[api/orders] failed to persist order:", persisted.error);
  }

  // Send the invoice PDF to the customer and to the store. This runs after the
  // order exists and can only downgrade the response, never reject it: the
  // customer may already have paid, and losing their order because a mail
  // provider is down would be the worse failure.
  let delivery: {
    invoiceUrl: string;
    emailedTo: string[];
    whatsappTo: string[];
    whatsappFallbackLink?: string;
  } | null = null;

  try {
    const report = await dispatchOrder(order);
    delivery = {
      invoiceUrl: report.invoiceUrl,
      emailedTo: report.email.recipients,
      whatsappTo: report.whatsapp.recipients,
      whatsappFallbackLink: report.whatsapp.fallbackLink,
    };
  } catch (err) {
    console.error(
      "[api/orders] invoice delivery failed — order stands:",
      err,
      JSON.stringify({ id: order.id }),
    );
  }

  // The client uses `delivery` to tell the customer where their copy went, and
  // to offer a manual WhatsApp send when automatic delivery is unavailable.
  return NextResponse.json({ order, delivery }, { status: 201 });
}
