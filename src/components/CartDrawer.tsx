"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";
import { cartSubtotal, cartSavings, cartCount } from "@/lib/cart";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { formatINR, isOptimizableImage } from "@/lib/utils";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/config";
import { cn } from "@/lib/utils";

export function CartDrawer() {
  const isOpen = useCartStore((s) => s.isOpen);
  const items = useCartStore((s) => s.items);
  const closeCart = useCartStore((s) => s.closeCart);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  // Never let the drawer (and its click-blocking overlay) outlive a
  // navigation — including programmatic ones like "Buy now" → /checkout.
  const pathname = usePathname();
  useEffect(() => closeCart(), [pathname, closeCart]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    if (isOpen) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, closeCart]);

  const subtotal = cartSubtotal(items);
  const savings = cartSavings(items);
  const count = cartCount(items);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50",
        isOpen ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!isOpen}
    >
      <div
        className={cn(
          "absolute inset-0 bg-ink/60 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0",
        )}
        onClick={closeCart}
      />

      <aside
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-bone-100 shadow-product-hover transition-transform duration-300 ease-showroom",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
      >
        <header className="flex items-center justify-between border-b border-bone-300 px-5 py-4">
          <h2 className="font-serif text-xl">
            Your Cart{count > 0 ? <span className="text-ink-500"> · {count}</span> : null}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Close cart"
            className="btn-ghost p-2"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="font-serif text-2xl">Your cart is empty</p>
            <p className="text-sm text-ink-500">
              Add a watch and it’ll show up here.
            </p>
            <button type="button" onClick={closeCart} className="btn-gold mt-2">
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            {/* Free-shipping progress */}
            <div className="border-b border-bone-300 px-5 py-3">
              <p className="text-xs text-ink-600">
                {remaining > 0 ? (
                  <>
                    Add <strong>{formatINR(remaining)}</strong> more for free
                    shipping
                  </>
                ) : (
                  <span className="font-semibold text-gold-600">
                    🎉 You’ve unlocked free shipping!
                  </span>
                )}
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bone-300">
                <div
                  className="h-full rounded-full bg-gold transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <ul className="flex-1 divide-y divide-bone-300 overflow-y-auto px-5">
              {items.map((item) => (
                <li key={item.productId} className="flex gap-4 py-4">
                  <Link
                    href={`/product/${item.slug}`}
                    onClick={closeCart}
                    className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-bone-300"
                  >
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.imageAlt}
                        fill
                        sizes="96px"
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
                      onClick={closeCart}
                      className="line-clamp-2 text-sm font-medium hover:text-gold"
                    >
                      {item.title}
                    </Link>
                    {item.isPreorder ? (
                      <span className="mt-0.5 text-xs font-medium text-gold">
                        Pre-order
                      </span>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <QuantityStepper
                        size="sm"
                        value={item.quantity}
                        onChange={(q) => setQuantity(item.productId, q)}
                      />
                      <span className="font-semibold">
                        {formatINR(item.price * item.quantity)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="mt-1 self-start text-xs text-ink-500 underline-offset-2 hover:text-ink hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="border-t border-bone-300 px-5 py-4">
              {savings > 0 ? (
                <p className="mb-2 text-sm font-medium text-gold-600">
                  You’re saving {formatINR(savings)}
                </p>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-600">Subtotal</span>
                <span className="text-lg font-semibold">{formatINR(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                Shipping &amp; taxes calculated at checkout.
              </p>
              <div className="mt-4 grid gap-2">
                <Link href="/checkout" onClick={closeCart} className="btn-gold w-full">
                  Checkout
                </Link>
                <Link
                  href="/cart"
                  onClick={closeCart}
                  className="btn-outline w-full border-ink/20"
                >
                  View cart
                </Link>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
