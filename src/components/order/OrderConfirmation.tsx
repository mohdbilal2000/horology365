import Link from "next/link";
import { SITE } from "@/lib/config";
import { formatINR, whatsappLink } from "@/lib/utils";
import type { Order } from "@/lib/types";

interface OrderConfirmationProps {
  order: Order;
  /** Hide the invoice link when the order only exists in sessionStorage
   *  (pre-storage-setup) — the invoice route reads from Blob storage. */
  downloadable?: boolean;
  /** Signed invoice URL. Required for the download link to work: the invoice
   *  route rejects an unsigned request. */
  invoiceHref?: string;
  /** Channels the invoice was sent on, so the page can say where to look. */
  sentTo?: { email?: string; whatsapp?: boolean };
}

/** Pure presentational order-confirmation body — shared by the server-side
 *  lookup path and the pre-storage-setup sessionStorage fallback. */
export function OrderConfirmation({
  order,
  downloadable = true,
  invoiceHref,
  sentTo,
}: OrderConfirmationProps) {
  const waHref = whatsappLink(
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
          ) : order.details.paymentMethod === "card" ? (
            <p className="mt-4 text-sm text-ink-500">
              Paid by <strong>card</strong> — {formatINR(order.total)}.
            </p>
          ) : (
            <div className="mt-4 text-sm text-ink-500">
              <p>
                Paid via{" "}
                <strong>
                  {order.details.paymentMethod === "bank_transfer"
                    ? "Bank Transfer"
                    : "UPI"}
                </strong>{" "}
                — {formatINR(order.total)}.
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

        {sentTo && (sentTo.email || sentTo.whatsapp) ? (
          <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/5 p-5 text-sm">
            <p className="font-semibold text-ink">
              Your invoice is on its way
              {sentTo.email ? ` to ${sentTo.email}` : ""}
              {sentTo.email && sentTo.whatsapp ? " and" : ""}
              {sentTo.whatsapp ? " to your WhatsApp" : ""}.
            </p>
            <p className="mt-1 text-ink-600">
              We keep a copy at the store too, so your order is on record either
              way. Not arrived? Download it below.
            </p>
          </div>
        ) : null}

        {downloadable && invoiceHref ? (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-bone-300 bg-bone-100 p-5">
            <div>
              <p className="text-sm font-semibold text-ink">Invoice</p>
              <p className="text-xs text-ink-500">Download a PDF copy for your records.</p>
            </div>
            <a
              href={invoiceHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline border-ink/20 px-5 py-2 text-sm"
            >
              Download
            </a>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-gold flex-1"
          >
            Confirm on WhatsApp
          </a>
          <Link href="/" className="btn-outline flex-1 border-ink/20">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
