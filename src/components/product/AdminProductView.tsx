"use client";

import Link from "next/link";
import { ProductDetail } from "@/components/product/ProductDetail";
import { displayBrandName, mergeProducts } from "@/lib/catalog";
import { getBrandBySlug } from "@/lib/mock/brands";
import { getProductsByBrand } from "@/lib/mock/products";
import { useAdminProduct, useAdminProducts, useHydrated } from "@/lib/store/catalog";

/**
 * Fallback for `/product/<slug>` when the slug isn't in the seeded catalog:
 * it may be a product added from /admin, which lives in the browser until
 * Phase 2 moves the catalog to Supabase. Resolves after hydration.
 */
export function AdminProductView({ slug }: { slug: string }) {
  const hydrated = useHydrated();
  const product = useAdminProduct(slug);
  const sameBrand = useAdminProducts({
    brandSlug: product?.brandSlug ?? "__none__",
  });

  if (!hydrated) {
    return (
      <div className="band-light">
        <div className="shell grid gap-8 py-8 sm:py-12 lg:grid-cols-2 lg:gap-12">
          <div className="aspect-square animate-pulse rounded-2xl bg-bone-300/60" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse rounded-full bg-bone-300/60" />
            <div className="h-5 w-1/3 animate-pulse rounded-full bg-bone-300/60" />
            <div className="h-24 animate-pulse rounded-2xl bg-bone-300/60" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="band-light">
        <div className="shell flex flex-col items-center gap-4 py-24 text-center">
          <span className="eyebrow">404</span>
          <h1 className="font-serif text-3xl sm:text-4xl">
            We couldn&apos;t find that watch
          </h1>
          <p className="max-w-md text-ink-600">
            It may have been removed from the catalogue. Browse the collections
            to find something you&apos;ll like more anyway.
          </p>
          <Link href="/" className="btn-gold mt-2">
            Back to the showroom
          </Link>
        </div>
      </div>
    );
  }

  const brandName = displayBrandName(product);
  const hasBrandPage = Boolean(getBrandBySlug(product.brandSlug));
  const related = mergeProducts(
    getProductsByBrand(product.brandSlug),
    sameBrand,
  )
    .filter((p) => p.id !== product.id)
    .slice(0, 4);

  return (
    <ProductDetail
      product={product}
      brandName={brandName}
      related={related}
      brandHref={hasBrandPage ? `/brand/${product.brandSlug}` : undefined}
    />
  );
}
