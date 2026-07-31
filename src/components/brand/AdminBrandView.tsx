"use client";

import Link from "next/link";
import { ProductGrid } from "@/components/ProductGrid";
import { BrandWordmark } from "@/components/BrandWordmark";
import { titleFromSlug } from "@/lib/catalog";
import { useAdminProducts, useHydrated } from "@/lib/store/catalog";

/**
 * Fallback for `/brand/<slug>` when the brand isn't seeded: the admin can add
 * a brand of their own, and its collection page has to work like any other.
 * Resolves from the browser-side admin catalog after hydration.
 */
export function AdminBrandView({ slug }: { slug: string }) {
  const hydrated = useHydrated();
  const products = useAdminProducts({ brandSlug: slug });
  const name = products[0]?.brandName ?? titleFromSlug(slug);

  if (!hydrated) {
    return (
      <div className="band-light">
        <div className="shell py-16">
          <div className="h-10 w-56 animate-pulse rounded-full bg-bone-300/60" />
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="band-light">
        <div className="shell flex flex-col items-center gap-4 py-24 text-center">
          <span className="eyebrow">404</span>
          <h1 className="font-serif text-3xl sm:text-4xl">
            No collection here yet
          </h1>
          <p className="max-w-md text-ink-600">
            We don&apos;t stock this brand right now. Browse the brands we do —
            there&apos;s plenty to fall for.
          </p>
          <Link href="/" className="btn-gold mt-2">
            Back to the showroom
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="band-light">
      <header className="bg-ink py-12 text-bone sm:py-16">
        <div className="shell">
          <span className="eyebrow">Brand Collection</span>
          <h1 className="mt-1">
            <BrandWordmark name={name} size="lg" />
          </h1>
        </div>
      </header>

      <div className="shell py-10 sm:py-14">
        <ProductGrid products={[]} brandName={name} sync={{ brandSlug: slug }} showCount />
      </div>
    </div>
  );
}
