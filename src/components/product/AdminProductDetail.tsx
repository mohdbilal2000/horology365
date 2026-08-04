"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductDetail } from "@/components/product/ProductDetail";
import { getBrandBySlug } from "@/lib/mock/brands";
import { useAdminProducts } from "@/lib/useAdminProducts";

interface AdminProductDetailProps {
  slug: string;
}

/** Resolves a product page slug against this browser's admin-added catalog
 *  once the client-side store has hydrated. Used as the fallback for slugs
 *  that don't exist in the static seed catalogue. */
export function AdminProductDetail({ slug }: AdminProductDetailProps) {
  const adminProducts = useAdminProducts();
  const product = adminProducts.find((p) => p.slug === slug);

  const [settled, setSettled] = useState(false);
  useEffect(() => setSettled(true), []);

  if (!product) {
    if (!settled) return <div className="min-h-[70vh]" />;
    return <AdminProductNotFound />;
  }

  const brand = getBrandBySlug(product.brandSlug);
  const brandName = brand?.name ?? product.brandSlug;
  const related = adminProducts
    .filter((p) => p.brandSlug === product.brandSlug && p.id !== product.id)
    .slice(0, 4);

  return <ProductDetail product={product} brandName={brandName} related={related} />;
}

export function AdminProductNotFound() {
  return (
    <div className="band-light">
      <div className="shell flex min-h-[70vh] flex-col items-center justify-center gap-6 py-20 text-center">
        <span className="font-serif text-7xl text-gold sm:text-8xl">404</span>
        <h1 className="font-serif text-3xl sm:text-4xl">This page slipped a gear</h1>
        <p className="max-w-md text-ink-500">
          The page you’re looking for doesn’t exist or has moved. Let’s get you
          back to the showroom.
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
