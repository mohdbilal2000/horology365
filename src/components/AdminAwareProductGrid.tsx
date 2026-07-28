"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductGrid } from "@/components/ProductGrid";
import { useCatalogStore } from "@/lib/store/catalog";
import { modelToProduct } from "@/lib/mock/fromAdmin";
import type { CategorySlug, Product } from "@/lib/types";

interface AdminAwareProductGridProps {
  /** Server-computed static products for this listing. */
  products: Product[];
  /** Only merge in admin models for this brand. */
  brandSlug?: string;
  /** Only merge in admin models for this category. */
  categorySlug?: CategorySlug;
  brandName?: string;
  /** Render the "N watches" count above the grid, kept in sync with the merge. */
  showCount?: boolean;
  /** Slug to always omit — e.g. the product whose page this grid appears on. */
  excludeSlug?: string;
}

/**
 * Wraps ProductGrid to also surface products added through /admin. Admin
 * models live in localStorage (client-only), so they can't be read during
 * the server render — we render the static list first (matches SSR output,
 * no hydration mismatch), then merge in matching admin products once
 * mounted.
 */
export function AdminAwareProductGrid({
  products,
  brandSlug,
  categorySlug,
  brandName,
  showCount,
  excludeSlug,
}: AdminAwareProductGridProps) {
  const models = useCatalogStore((s) => s.models);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const merged = useMemo(() => {
    const base = excludeSlug
      ? products.filter((p) => p.slug !== excludeSlug)
      : products;
    if (!ready) return base;
    const extra = models
      .filter((m) => (brandSlug ? m.brandSlug === brandSlug : true))
      .filter((m) => (categorySlug ? m.categorySlug === categorySlug : true))
      .map(modelToProduct)
      .filter((p) => p.slug !== excludeSlug)
      .filter((p) => !base.some((existing) => existing.slug === p.slug));
    return extra.length ? [...extra, ...base] : base;
  }, [ready, models, products, brandSlug, categorySlug, excludeSlug]);

  return (
    <>
      {showCount ? (
        <p className="mb-6 text-sm text-ink-500">
          {merged.length} {merged.length === 1 ? "watch" : "watches"}
        </p>
      ) : null}
      <ProductGrid products={merged} brandName={brandName} />
    </>
  );
}
