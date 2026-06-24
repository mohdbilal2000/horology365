"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/store/cart";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { Countdown } from "@/components/ui/Countdown";
import { SITE } from "@/lib/config";
import { whatsappLink, formatINR, formatDropDate } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface ProductPurchaseProps {
  product: Product;
  brandName: string;
}

export function ProductPurchase({ product, brandName }: ProductPurchaseProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const [qty, setQty] = useState(1);

  const soldOut = !product.isPreorder && product.stock <= 0;
  const maxQty = product.isPreorder ? 5 : Math.min(10, Math.max(1, product.stock));

  function addToCart() {
    if (soldOut) return;
    addItem(product, brandName, qty);
    openCart();
  }

  function buyNow() {
    if (soldOut) return;
    addItem(product, brandName, qty);
    router.push("/checkout");
  }

  const waHref = whatsappLink(
    SITE.whatsappNumber,
    `Hi Horology365 👋 I'm interested in the ${brandName} ${product.title} (${formatINR(
      product.price,
    )}). ${SITE.url}/product/${product.slug}`,
  );

  return (
    <div className="mt-6">
      {/* Stock / pre-order status */}
      <div className="mb-5">
        {product.isPreorder ? (
          <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-gold-700">
              <span className="h-2 w-2 rounded-full bg-gold" />
              Pre-order
              {product.dropDate ? ` · drops ${formatDropDate(product.dropDate)}` : ""}
            </span>
            {product.dropDate ? (
              <div className="mt-3">
                <Countdown target={product.dropDate} tone="light" />
              </div>
            ) : null}
            <p className="mt-3 text-xs text-ink-500">
              Reserve now to lock today&apos;s price. We ship the moment the batch
              lands — no extra charge.
            </p>
          </div>
        ) : soldOut ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-ink/10 px-3 py-1.5 text-sm font-semibold text-ink-600">
            Currently sold out
          </span>
        ) : product.stock <= 5 ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-red-500/10 px-3 py-1.5 text-sm font-semibold text-red-600">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Only {product.stock} left in stock
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            In stock · ready to ship
          </span>
        )}
      </div>

      {!soldOut ? (
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-ink-600">Quantity</span>
          <QuantityStepper value={qty} onChange={setQty} max={maxQty} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={addToCart}
          disabled={soldOut}
          className="btn-outline border-ink/25 text-ink"
        >
          {product.isPreorder ? "Pre-order — add to cart" : "Add to cart"}
        </button>
        <button
          type="button"
          onClick={buyNow}
          disabled={soldOut}
          className="btn-gold"
        >
          Buy now
        </button>
      </div>

      {/* WhatsApp fallback */}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-[#25D366] px-7 py-3 text-sm font-semibold text-[#1da851] transition hover:bg-[#25D366]/10"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24z" />
        </svg>
        Order on WhatsApp
      </a>
    </div>
  );
}
