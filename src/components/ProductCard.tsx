"use client";

import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/lib/store/cart";
import { PriceTag } from "@/components/PriceTag";
import { StarRating } from "@/components/ui/StarRating";
import { cn, formatDropDate } from "@/lib/utils";
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
  const cover = product.images[0];
  const soldOut = !product.isPreorder && product.stock <= 0;

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (soldOut) return;
    addItem(product, brandName, 1);
  }

  return (
    <article
      className={cn(
        "group relative flex flex-col",
        fixedWidth && "w-[260px] shrink-0 snap-start sm:w-[280px]",
        className,
      )}
    >
      <Link
        href={`/product/${product.slug}`}
        className="flex flex-col"
        aria-label={`${brandName} ${product.title}`}
      >
        <div className="product-frame aspect-square">
          {cover ? (
            <Image
              src={cover.url}
              alt={cover.alt}
              fill
              sizes="(max-width: 640px) 50vw, 280px"
              className="object-cover transition-transform duration-500 ease-showroom group-hover:scale-105"
            />
          ) : null}

          {/* Badges */}
          <div className="absolute left-3 top-3 flex flex-col gap-1.5">
            {product.isPreorder ? (
              <span className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink">
                Pre-order
              </span>
            ) : null}
            {product.isFeatured && !product.isPreorder ? (
              <span className="rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-bone">
                Featured
              </span>
            ) : null}
          </div>

          {soldOut ? (
            <div className="absolute inset-0 flex items-center justify-center bg-ink/55">
              <span className="rounded-full border border-bone/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-label text-bone">
                Sold out
              </span>
            </div>
          ) : null}

          {/* Quick add — appears on hover, always tappable on touch. */}
          {!soldOut ? (
            <button
              type="button"
              onClick={handleAdd}
              className="absolute inset-x-3 bottom-3 translate-y-2 rounded-full bg-ink/90 py-2.5 text-xs font-semibold uppercase tracking-wide text-bone opacity-0 backdrop-blur transition-all duration-300 ease-showroom hover:bg-gold hover:text-ink group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100"
            >
              {product.isPreorder ? "Pre-order" : "Add to cart"}
            </button>
          ) : null}
        </div>
      </Link>

      <div className="mt-3.5 flex flex-1 flex-col">
        <span className="text-[11px] font-semibold uppercase tracking-label text-c-55">
          {brandName}
        </span>
        <Link
          href={`/product/${product.slug}`}
          className="mt-1 line-clamp-2 font-medium leading-snug transition hover:text-gold"
        >
          {product.title}
        </Link>
        <StarRating
          rating={product.rating}
          reviewCount={product.reviewCount}
          className="mt-1.5"
        />
        <div className="mt-2 flex items-end justify-between gap-2">
          <PriceTag price={product.price} mrp={product.mrp} size="sm" />
        </div>
        {product.isPreorder && product.dropDate ? (
          <span className="mt-1.5 text-xs font-medium text-gold">
            Drops {formatDropDate(product.dropDate)}
          </span>
        ) : null}
      </div>
    </article>
  );
}
