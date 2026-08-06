"use client";

import { ProductGrid } from "@/components/ProductGrid";
import { useAdminProducts } from "@/lib/liveCatalog";
import type { Product } from "@/lib/types";

interface LiveProductGridProps {
  /** Products resolved on the server from the built-in catalog. */
  products: Product[];
  /** Which admin-published products belong on this page. */
  filter?: { brandSlug?: string; categorySlug?: string };
  /** Override brand name (e.g. on a brand page where it's constant). */
  brandName?: string;
  /** Show the "N watches" count line above the grid. */
  showCount?: boolean;
}

/**
 * ProductGrid that also pulls in products published from the admin, so new
 * inventory appears on brand / category pages the moment it's added.
 */
export function LiveProductGrid({
  products,
  filter,
  brandName,
  showCount = false,
}: LiveProductGridProps) {
  const adminProducts = useAdminProducts().filter(
    (p) =>
      (!filter?.brandSlug || p.brandSlug === filter.brandSlug) &&
      (!filter?.categorySlug || p.categorySlug === filter.categorySlug),
  );

  // Newest admin additions lead the grid.
  const merged = [...adminProducts, ...products];

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
