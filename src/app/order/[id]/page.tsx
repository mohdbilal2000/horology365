"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { SITE } from "@/lib/config";
import { formatINR, whatsappLink } from "@/lib/utils";
import type { Order, OrderDelivery } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrderConfirmationPage({ params }: PageProps) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [delivery, setDelivery] = useState<OrderDelivery | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(`order:${id}`);
      if (raw) {
        const parsed = JSON.parse(raw) as
          | { order: Order; delivery: OrderDelivery | null }
          | Order;
        // Tolerate the older shape (a bare Order) still sitting in a tab that
        // was open across the deploy.
        if ("order" in parsed) {
          setOrder(parsed.order);
          setDelivery(parsed.delivery);
        } else {
          setOrder(parsed);
        }
      }
    } catch {
      setOrder(null);
    } finally {
      setLoaded(true);
    }
  }, [id]);

  if (!loaded) {
    return (
      <div className="band-light">
        <div className="shell flex min-h-[50vh] items-center justify-center py-20">
          <p className="text-ink-500">Loading your order…</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="band-light">
        <div className="shell flex min-h-[50vh] flex-col items-center justify-center gap-4 py-20 text-center">
          <h1 className="font-serif text-3xl">Order not found</h1>
          <p className="max-w-sm text-ink-500">
            We couldn’t find order <span className="font-mono">{id}</span> in this
            session. If you’ve just paid, check your email or WhatsApp for the
            confirmation.
          </p>
          <Link href="/" className="btn-gold">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const waHref =
    delivery?.whatsappFallbackLink ??
    whatsappLink(
      SITE.whatsappNumber,
      `Hi Horology365 👋 I just placed order ${order.id}. Please confirm the details.`,
    );

  return (
    <div className="band-light">
      <div className="shell max-w-2xl section-y">
        <div className="rounded-2xl border border-bone-300 bg-bone-100 p-8 text-center shadow-product">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/15 text-gold">
            <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-5 font-serif text-3xl">Order confirmed!</h1>
          <p className="mt-2 text-ink-600">
            Thank you, {order.details.name.split(" ")[0]}. We’ve received your order.
          </p>
          <p className="mt-4 inline-block rounded-full bg-ink px-4 py-2 font-mono text-sm text-bone">
            {order.id}
          </p>
          {order.details.paymentMethod === "cod" ? (
            <p className="mt-4 text-sm text-ink-500">
              Payment method: <strong>Cash on Delivery</strong>. Keep{" "}
              {formatINR(order.total)} ready at delivery.
            </p>
          ) : (
            <div className="mt-4 text-sm text-ink-500">
              <p>
                Paid via <strong>UPI</strong> — {formatINR(order.total)}.
              </p>
              {order.details.upiReference ? (
                <p className="mt-1">
                  Ref:{" "}
                  <span className="font-mono text-ink-700">
                    {order.details.upiReference}
                  </span>
                </p>
              ) : null}
              <p className="mt-1 text-gold-700">
                We’re verifying your payment and will dispatch once confirmed.
              </p>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="mt-6 rounded-2xl border border-bone-300 bg-bone-100 p-6">
          <h2 className="font-serif text-xl">Order details</h2>
          <ul className="mt-4 divide-y divide-bone-300">
            {order.items.map((item) => (
              <li key={item.productId} className="flex justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  <span className="line-clamp-1 font-medium">{item.title}</span>
                  <span className="text-ink-500">
                    {item.brandName} · Qty {item.quantity}
                  </span>
                </span>
                <span className="shrink-0 font-medium">
                  {formatINR(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-bone-300 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-600">Subtotal</dt>
              <dd>{formatINR(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-600">Shipping</dt>
              <dd>{order.shipping === 0 ? "Free" : formatINR(order.shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-bone-300 pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd>{formatINR(order.total)}</dd>
            </div>
          </dl>
        </div>

        {/* Shipping address */}
        <div className="mt-6 rounded-2xl border border-bone-300 bg-bone-100 p-6 text-sm">
          <h2 className="font-serif text-xl">Shipping to</h2>
          <address className="mt-3 not-italic text-ink-700">
            {order.details.name}
            <br />
            {order.details.addressLine1}
            {order.details.addressLine2 ? (
              <>
                <br />
                {order.details.addressLine2}
              </>
            ) : null}
            <br />
            {order.details.city}, {order.details.state} {order.details.pincode}
            <br />
            {order.details.phone}
          </address>
        </div>

        <DeliveryPanel delivery={delivery} />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {delivery?.invoiceUrl ? (
            <a
              href={delivery.invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold flex-1"
            >
              Download invoice (PDF)
            </a>
          ) : null}
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className={
              delivery?.invoiceUrl
                ? "btn-outline flex-1 border-ink/20"
                : "btn-gold flex-1"
            }
          >
            {delivery?.whatsappTo.length ? "Message us on WhatsApp" : "Send on WhatsApp"}
          </a>
          <Link href="/" className="btn-outline flex-1 border-ink/20">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Tells the customer where their copy of the invoice actually went.
 *
 * This reports what the server really did rather than a fixed reassurance —
 * if email or WhatsApp delivery didn't run, saying "check your email" would be
 * a lie, and the customer would wait for something that never arrives.
 */
function DeliveryPanel({ delivery }: { delivery: OrderDelivery | null }) {
  if (!delivery) return null;

  const emailed = delivery.emailedTo.length > 0;
  const whatsapped = delivery.whatsappTo.length > 0;
  if (!emailed && !whatsapped) return null;

  const channels = [
    emailed ? "email" : null,
    whatsapped ? "WhatsApp" : null,
  ].filter(Boolean);

  return (
    <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-5 text-sm">
      <p className="font-semibold text-ink">
        Your invoice is on its way by {channels.join(" and ")}.
      </p>
      <p className="mt-1 text-ink-600">
        We&rsquo;ve also kept a copy at the store, so your order is on record
        either way.
      </p>
    </div>
  );
}
