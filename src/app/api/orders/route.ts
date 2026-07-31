import { NextResponse } from "next/server";
import { validateCheckout, validateCartItems } from "@/lib/validation";
import { cartSubtotal, cartShipping } from "@/lib/cart";
import { generateOrderId } from "@/lib/utils";
import { COD_ENABLED, UPI_ENABLED } from "@/lib/config";
import type { CartItem, CheckoutDetails, Order } from "@/lib/types";

/**
 * Phase 1: server-side validated mock order creation. No database write yet.
 * The same contract is reused in Phase 2, where the body is persisted to
 * Supabase and (for UPI) a Razorpay order is created + signature verified.
 *
 * Fail closed: an order is only acknowledged after validation passes, and
 * UPI is rejected until NEXT_PUBLIC_PAYMENT_MODE enables it.
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
    // COD orders are "pending" until delivered; UPI would be "paid" after
    // verified signature in Phase 2.
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json({ order }, { status: 201 });
}
