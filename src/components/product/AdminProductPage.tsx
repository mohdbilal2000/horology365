"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProductDetail } from "@/components/product/ProductDetail";
import { useCatalogStore } from "@/lib/store/catalog";
import { modelToProduct, adminModelSlug } from "@/lib/mock/fromAdmin";
import { getBrandBySlug } from "@/lib/mock/brands";

interface AdminProductPageProps {
  slug: string;
}

/**
 * Product page for models saved through /admin. These live only in the
 * browser's localStorage, so the lookup has to happen client-side after
 * mount — the server render can't see them.
 */
export function AdminProductPage({ slug }: AdminProductPageProps) {
  const models = useCatalogStore((s) => s.models);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const product = useMemo(() => {
    const model = models.find((m) => adminModelSlug(m) === slug);
    return model ? modelToProduct(model) : undefined;
  }, [models, slug]);

  const related = useMemo(() => {
    if (!product) return [];
    return models
      .filter((m) => m.brandSlug === product.brandSlug)
      .map(modelToProduct)
      .filter((p) => p.slug !== product.slug)
      .slice(0, 4);
  }, [models, product]);

  if (!ready) {
    return (
      <div className="band-light">
        <div className="shell py-8 sm:py-12">
          <div className="h-96 animate-pulse rounded-3xl bg-bone-300/60" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="band-light">
        <div className="shell flex min-h-[70vh] flex-col items-center justify-center gap-6 py-20 text-center">
          <span className="font-serif text-7xl text-gold sm:text-8xl">404</span>
          <h1 className="font-serif text-3xl sm:text-4xl">This page slipped a gear</h1>
          <p className="max-w-md text-ink-500">
            We couldn&apos;t find that watch. It may have been removed from the
            catalogue.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn-gold">
              Back to home
            </Link>
            <Link
              href="/category/mens-watches"
              className="btn-outline border-ink/20"
            >
              Browse watches
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const brandName = getBrandBySlug(product.brandSlug)?.name ?? product.brandSlug;

  return (
    <div className="band-light">
      <ProductDetail product={product} brandName={brandName} related={related} />
    </div>
  );
}
