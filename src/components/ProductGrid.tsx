"use client";

import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import {
  displayBrandName,
  mergeProducts,
  type CatalogScope,
} from "@/lib/catalog";
import { useAdminProducts } from "@/lib/store/catalog";
import type { Product } from "@/lib/types";

interface ProductGridProps {
  products: Product[];
  /** Override brand name (e.g. on a brand page where it's constant). */
  brandName?: string;
  /**
   * Merge in matching admin-added products. They arrive after hydration (the
   * admin catalog lives in the browser until Phase 2), so the grid renders
   * server-side from the seeded catalog and tops up on the client.
   */
  sync?: CatalogScope;
  /** Render a live "N watches" count above the grid. */
  showCount?: boolean;
}

export function ProductGrid({
  products,
  brandName,
  sync,
  showCount = false,
}: ProductGridProps) {
  const added = useAdminProducts(sync ?? {});
  const items = sync ? mergeProducts(products, added) : products;

  if (items.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-c-60">
        No watches here yet — check back after the next drop.
      </p>
    );
  }

  return (
    <>
      {showCount ? (
        <p className="mb-6 text-sm text-ink-500">
          {items.length} {items.length === 1 ? "watch" : "watches"}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {items.map((product, i) => (
          <Reveal key={product.id} delay={(i % 4) * 50} as="div">
            <ProductCard
              product={product}
              brandName={brandName ?? displayBrandName(product)}
            />
          </Reveal>
        ))}
      </div>
    </>
  );
}
