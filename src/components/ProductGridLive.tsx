"use client";

import { ProductGrid } from "@/components/ProductGrid";
import { useAdminProducts } from "@/lib/useAdminProducts";
import type { CategorySlug, Product } from "@/lib/types";

type Filter =
  | { type: "category"; value: CategorySlug }
  | { type: "brand"; value: string };

interface ProductGridLiveProps {
  /** Server-rendered products from the static seed catalogue. */
  initialProducts: Product[];
  filter: Filter;
  brandName?: string;
}

/** `ProductGrid`, extended with this browser's admin-added products that
 *  match the same category/brand filter as the server-rendered list. */
export function ProductGridLive({
  initialProducts,
  filter,
  brandName,
}: ProductGridLiveProps) {
  const adminProducts = useAdminProducts().filter((p) =>
    filter.type === "category"
      ? p.categorySlug === filter.value
      : p.brandSlug === filter.value,
  );

  const knownSlugs = new Set(initialProducts.map((p) => p.slug));
  const merged = [
    ...adminProducts.filter((p) => !knownSlugs.has(p.slug)),
    ...initialProducts,
  ];

  return (
    <>
      <p className="mb-6 text-sm text-ink-500">
        {merged.length} {merged.length === 1 ? "watch" : "watches"}
      </p>
      <ProductGrid products={merged} brandName={brandName} />
    </>
  );
}
