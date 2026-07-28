"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Carousel } from "@/components/ui/Carousel";
import { ProductCard } from "@/components/ProductCard";
import { BrandWordmark } from "@/components/BrandWordmark";
import { BrandLogo } from "@/components/BrandLogo";
import { Reveal } from "@/components/ui/Reveal";
import { useCatalogStore } from "@/lib/store/catalog";
import { modelToProduct } from "@/lib/mock/fromAdmin";
import { cn } from "@/lib/utils";
import type { Brand, Product } from "@/lib/types";

interface BrandBayProps {
  brand: Brand;
  products: Product[];
  tone: "dark" | "light";
}

/**
 * One repeatable "bay" per active brand: logo + tagline + product carousel.
 * Merges in matching admin-added products once mounted (they live in
 * localStorage, so they aren't available during the server render).
 */
export function BrandBay({ brand, products: staticProducts, tone }: BrandBayProps) {
  const models = useCatalogStore((s) => s.models);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const products = useMemo(() => {
    if (!ready) return staticProducts;
    const extra = models
      .filter((m) => m.brandSlug === brand.slug)
      .map(modelToProduct)
      .filter((p) => !staticProducts.some((existing) => existing.slug === p.slug));
    return extra.length ? [...extra, ...staticProducts] : staticProducts;
  }, [ready, models, staticProducts, brand.slug]);

  if (products.length === 0) return null;

  return (
    <section
      className={cn("section-y", tone === "dark" ? "band-dark" : "band-light")}
      aria-labelledby={`bay-${brand.slug}`}
    >
      <div className="shell">
        <Reveal className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-bone p-3 shadow-product ring-1 ring-bone-400/40">
              <BrandLogo brand={brand} monogram className="text-ink" />
            </div>
            <div>
              <span className="eyebrow">Brand Bay</span>
              <h3 id={`bay-${brand.slug}`}>
                <BrandWordmark name={brand.name} size="lg" />
              </h3>
              <p className="mt-1 text-sm text-c-60">{brand.tagline}</p>
            </div>
          </div>
          <Link
            href={`/brand/${brand.slug}`}
            className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-gold transition hover:text-gold-300"
          >
            View all
            <span
              aria-hidden="true"
              className="transition-transform duration-300 ease-showroom group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </Reveal>

        <Reveal>
          <Carousel label={`${brand.name} products`} tone={tone}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                brandName={brand.name}
                fixedWidth
              />
            ))}
          </Carousel>
        </Reveal>
      </div>
    </section>
  );
}
