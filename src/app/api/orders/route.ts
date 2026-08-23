import { NextResponse } from "next/server";
import { validateCheckout, validateCartItems } from "@/lib/validation";
import { cartSubtotal, cartShipping } from "@/lib/pricing";
import { generateOrderId } from "@/lib/utils";
import { COD_ENABLED, UPI_ENABLED } from "@/lib/config";
import { dispatchOrder } from "@/lib/notify/dispatch";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import type { CartItem, CheckoutDetails, Order } from "@/lib/types";

/**
 * Order creation.
 *
 * Fail closed on validation and payment mode, then — once the order is real —
 * persist it and push the invoice PDF to the customer and the store over email
 * and WhatsApp. Delivery problems downgrade the response but never reject an
 * order that already validated: the customer has paid by that point, and losing
 * their order because our mail provider is down would be the worse failure.
 */

export const runtime = "nodejs";

/** Guards against a script hammering the endpoint with junk orders. */
const ORDER_RATE_LIMIT = { limit: 12, windowMs: 10 * 60 * 1000 };

export async function POST(request: Request): Promise<NextResponse> {
  const ip = clientIp(request);
  const limited = rateLimit(`orders:${ip}`, ORDER_RATE_LIMIT);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many orders from this connection. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
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
    // COD orders are "pending" until delivered; UPI stays pending until the
    // transaction reference is verified against the bank statement.
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  // dispatchOrder persists first and swallows per-channel failures, but a
  // misconfiguration it can't absorb (a missing APP_SECRET, say) would still
  // throw. An order that has already validated — and, for UPI, already been
  // paid — must never be lost to that, so fall back to acknowledging it and
  // logging the whole order for manual recovery.
  let report;
  try {
    report = await dispatchOrder(order);
  } catch (err) {
    console.error(
      "[orders] DISPATCH FAILED — order accepted but not delivered:",
      err,
      JSON.stringify(order),
    );
    return NextResponse.json(
      {
        order,
        delivery: {
          recorded: false,
          invoiceUrl: "",
          emailedTo: [],
          whatsappTo: [],
        },
      },
      { status: 201 },
    );
  }

  return NextResponse.json(
    {
      order,
      // The client uses this to tell the customer where their copy went, and to
      // offer a manual WhatsApp send when automatic delivery is unavailable.
      delivery: {
        recorded: report.recorded,
        invoiceUrl: report.invoiceUrl,
        emailedTo: report.email.recipients,
        whatsappTo: report.whatsapp.recipients,
        whatsappFallbackLink: report.whatsapp.fallbackLink,
      },
    },
    { status: 201 },
  );
}
