"use client";

import { useEffect, useMemo, useState } from "react";
import { Carousel } from "@/components/ui/Carousel";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { Countdown } from "@/components/ui/Countdown";
import { getBrandBySlug } from "@/lib/mock/brands";
import { useCatalogStore } from "@/lib/store/catalog";
import { modelToProduct } from "@/lib/mock/fromAdmin";
import type { Product } from "@/lib/types";

interface DropCarouselProps {
  products: Product[];
}

/**
 * This Week's Drop — pre-order carousel on a dark band. Merges in
 * admin-added pre-order models once mounted (client-only localStorage data).
 */
export function DropCarousel({ products: staticProducts }: DropCarouselProps) {
  const models = useCatalogStore((s) => s.models);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const products = useMemo(() => {
    if (!ready) return staticProducts;
    const extra = models
      .map(modelToProduct)
      .filter((p) => p.isPreorder)
      .filter((p) => !staticProducts.some((existing) => existing.slug === p.slug));
    return extra.length ? [...extra, ...staticProducts] : staticProducts;
  }, [ready, models, staticProducts]);

  if (products.length === 0) return null;

  // Soonest upcoming drop date drives the urgency countdown.
  const nextDrop = products
    .map((p) => p.dropDate)
    .filter((d): d is string => Boolean(d))
    .sort()[0];

  return (
    <section id="weekly-drop" className="band-light section-y">
      <div className="shell">
        <SectionHeader
          label="Pre-order Now"
          title="This Week's Drop"
          description="Reserve the next batch before it lands and lock today's price."
          viewAllHref="/category/mens-watches"
          viewAllLabel="All pre-orders"
        />

        {nextDrop ? (
          <Reveal className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-bone-300 bg-bone-100 px-5 py-4 shadow-glass">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2 w-2 animate-pulse rounded-full bg-gold" />
              Next batch closes in
            </span>
            <Countdown target={nextDrop} tone="light" />
            <span className="text-sm text-ink-500">
              Reserve now — pay nothing extra when it ships.
            </span>
          </Reveal>
        ) : null}

        <Reveal>
          <Carousel label="This week's pre-order drop" tone="light">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                brandName={getBrandBySlug(product.brandSlug)?.name ?? ""}
                fixedWidth
              />
            ))}
          </Carousel>
        </Reveal>
      </div>
    </section>
  );
}
