"use client";

import { BrandBay } from "@/components/BrandBay";
import { useAdminProducts } from "@/lib/useAdminProducts";
import type { Brand, Product } from "@/lib/types";

interface BrandBayLiveProps {
  brand: Brand;
  initialProducts: Product[];
  tone: "dark" | "light";
}

/** `BrandBay`, extended with this browser's admin-added products for the
 *  same brand. */
export function BrandBayLive({ brand, initialProducts, tone }: BrandBayLiveProps) {
  const adminProducts = useAdminProducts().filter(
    (p) => p.brandSlug === brand.slug,
  );
  const knownSlugs = new Set(initialProducts.map((p) => p.slug));
  const merged = [
    ...adminProducts.filter((p) => !knownSlugs.has(p.slug)),
    ...initialProducts,
  ];

  return <BrandBay brand={brand} products={merged} tone={tone} />;
}
