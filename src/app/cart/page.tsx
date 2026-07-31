"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCartStore,
  cartSubtotal,
  cartSavings,
  cartShipping,
} from "@/lib/store/cart";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { formatINR, isOptimizableImage } from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/config";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const subtotal = cartSubtotal(items);
  const savings = cartSavings(items);
  const shipping = cartShipping(subtotal);
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <div className="band-light">
        <div className="shell flex min-h-[60vh] flex-col items-center justify-center gap-5 py-20 text-center">
          <h1 className="font-serif text-3xl sm:text-4xl">Your cart is empty</h1>
          <p className="max-w-sm text-ink-500">
            Browse the showroom and add a watch — it’ll show up here.
          </p>
          <Link href="/" className="btn-gold">
            Start shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="band-light">
      <div className="shell py-10 sm:py-14">
        <h1 className="font-serif text-3xl sm:text-4xl">Shopping Cart</h1>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
          {/* Line items */}
          <ul className="divide-y divide-bone-300 border-y border-bone-300">
            {items.map((item) => (
              <li key={item.productId} className="flex gap-4 py-5 sm:gap-6">
                <Link
                  href={`/product/${item.slug}`}
                  className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-bone-300 sm:h-32 sm:w-32"
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.imageAlt}
                      fill
                      sizes="128px"
                      className="object-cover"
                      unoptimized={!isOptimizableImage(item.imageUrl)}
                    />
                  ) : null}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[11px] font-semibold uppercase tracking-label text-ink-500">
                    {item.brandName}
                  </span>
                  <Link
                    href={`/product/${item.slug}`}
                    className="font-medium hover:text-gold"
                  >
                    {item.title}
                  </Link>
                  {item.isPreorder ? (
                    <span className="mt-0.5 text-xs font-medium text-gold">
                      Pre-order
                    </span>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                    <QuantityStepper
                      size="sm"
                      value={item.quantity}
                      onChange={(q) => setQuantity(item.productId, q)}
                    />
                    <div className="text-right">
                      <span className="font-semibold">
                        {formatINR(item.price * item.quantity)}
                      </span>
                      {item.mrp > item.price ? (
                        <span className="ml-2 text-sm text-ink-500 line-through">
                          {formatINR(item.mrp * item.quantity)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="mt-2 self-start text-xs text-ink-500 underline-offset-2 hover:text-ink hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Summary */}
          <aside className="h-fit rounded-2xl border border-bone-300 bg-bone-100 p-6 lg:sticky lg:top-24">
            <h2 className="font-serif text-xl">Order Summary</h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-600">Subtotal</dt>
                <dd className="font-medium">{formatINR(subtotal)}</dd>
              </div>
              {savings > 0 ? (
                <div className="flex justify-between text-gold-600">
                  <dt>Savings</dt>
                  <dd className="font-medium">−{formatINR(savings)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-ink-600">Shipping</dt>
                <dd className="font-medium">
                  {shipping === 0 ? "Free" : formatINR(shipping)}
                </dd>
              </div>
              {shipping > 0 ? (
                <p className="text-xs text-ink-500">
                  Free shipping over {formatINR(FREE_SHIPPING_THRESHOLD)}.
                </p>
              ) : null}
            </dl>
            <div className="mt-4 flex justify-between border-t border-bone-300 pt-4">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-semibold">{formatINR(total)}</span>
            </div>
            <Link href="/checkout" className="btn-gold mt-6 w-full">
              Proceed to checkout
            </Link>
            <Link
              href="/"
              className="mt-3 block text-center text-sm text-ink-500 hover:text-ink"
            >
              Continue shopping
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
