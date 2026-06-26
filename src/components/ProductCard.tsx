"use client";

import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";
import { PriceTag } from "@/components/PriceTag";
import { StarRating } from "@/components/ui/StarRating";
import { cn, discountPercent, formatDropDate } from "@/lib/utils";
import type { Product } from "@/lib/types";

interface ProductCardProps {
  product: Product;
  brandName: string;
  className?: string;
  /** Carousel cards get a fixed width; grid cards stay fluid. */
  fixedWidth?: boolean;
}

export function ProductCard({
  product,
  brandName,
  className,
  fixedWidth = false,
}: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const wishlisted = useWishlistStore((s) => s.ids.includes(product.id));
  const toggleWish = useWishlistStore((s) => s.toggle);

  const cover = product.images[0];
  const soldOut = !product.isPreorder && product.stock <= 0;
  const off = discountPercent(product.mrp, product.price);
  const lowStock = !product.isPreorder && product.stock > 0 && product.stock <= 5;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    addItem(product, brandName, 1);
  }

  function handleWish(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleWish(product.id);
  }

  return (
    <article
      className={cn(
        "surface-card group relative flex flex-col overflow-hidden rounded-2xl hover:-translate-y-1 hover:shadow-product-hover",
        fixedWidth && "w-[260px] shrink-0 snap-start sm:w-[280px]",
        className,
      )}
    >
      <Link
        href={`/product/${product.slug}`}
        className="relative block"
        aria-label={`${brandName} ${product.title}`}
      >
        <div className="shine relative aspect-square overflow-hidden bg-bone-300/40">
          {cover ? (
            <Image
              src={cover.url}
              alt={cover.alt}
              fill
              sizes="(max-width: 640px) 50vw, 280px"
              className="object-cover transition-transform duration-500 ease-showroom group-hover:scale-105"
            />
          ) : null}

          {/* Badges (top-left) */}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {product.isPreorder ? (
              <span className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink shadow-gold">
                Pre-order
              </span>
            ) : off > 0 ? (
              <span className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold text-ink shadow-gold">
                {off}% OFF
              </span>
            ) : null}
            {lowStock ? (
              <span className="glass-chip rounded-full px-2.5 py-1 text-[10px] font-semibold text-white">
                Only {product.stock} left
              </span>
            ) : null}
          </div>

          {/* Wishlist (top-right) */}
          <button
            type="button"
            onClick={handleWish}
            aria-pressed={wishlisted}
            aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
            className="glass-chip absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:scale-105"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px]"
              width={18}
              height={18}
              fill={wishlisted ? "#C9A24A" : "none"}
              stroke={wishlisted ? "#C9A24A" : "currentColor"}
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7.5-4.6-10-9.3C.7 8.4 2.3 5 5.6 5c2 0 3.3 1.1 4.4 2.6C11.1 6.1 12.4 5 14.4 5c3.3 0 4.9 3.4 3.6 6.7C19.5 16.4 12 21 12 21z" />
            </svg>
          </button>

          {soldOut ? (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/55">
              <span className="rounded-full border border-bone/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-label text-bone">
                Sold out
              </span>
            </div>
          ) : null}
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        <span className="text-[11px] font-semibold uppercase tracking-label text-c-55">
          {brandName}
        </span>
        <Link
          href={`/product/${product.slug}`}
          className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug tracking-tight transition hover:text-gold"
        >
          {product.title}
        </Link>
        <StarRating
          rating={product.rating}
          reviewCount={product.reviewCount}
          className="mt-2"
        />
        <PriceTag
          price={product.price}
          mrp={product.mrp}
          size="md"
          className="mt-2.5"
        />
        {product.isPreorder && product.dropDate ? (
          <span className="mt-1.5 text-xs font-semibold text-gold">
            Drops {formatDropDate(product.dropDate)}
          </span>
        ) : null}

        {/* Always-visible add button (mobile-friendly; fills accent on hover) */}
        <button
          type="button"
          onClick={handleAdd}
          disabled={soldOut}
          className={cn(
            "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-c-20 py-2.5 text-xs font-semibold tracking-wide transition",
            "hover:border-gold hover:bg-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          {!soldOut ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12l1 13H5L6 7z" />
              <path strokeLinecap="round" d="M9 7a3 3 0 016 0" />
            </svg>
          ) : null}
          {soldOut ? "Sold out" : product.isPreorder ? "Pre-order" : "Add to bag"}
        </button>
      </div>
    </article>
  );
}
