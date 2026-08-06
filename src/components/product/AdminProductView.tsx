"use client";

import Link from "next/link";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { PriceTag } from "@/components/PriceTag";
import { getBrandBySlug } from "@/lib/mock/brands";
import { useAdminProduct } from "@/lib/liveCatalog";
import { humanizeSlug } from "@/lib/utils";

/**
 * Client-rendered product page for items published from the admin. These
 * live in the Phase-1 client-side catalog, so the server can't resolve them
 * — this component looks the slug up after hydration and renders the same
 * layout as the static product page.
 */
export function AdminProductView({ slug }: { slug: string }) {
  const { product, ready } = useAdminProduct(slug);

  if (!ready) {
    return (
      <div className="band-light">
        <div className="shell py-8 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <div className="aspect-square animate-pulse rounded-3xl bg-bone-300/60" />
            <div className="space-y-4">
              <div className="h-4 w-24 animate-pulse rounded bg-bone-300/60" />
              <div className="h-10 w-3/4 animate-pulse rounded bg-bone-300/60" />
              <div className="h-6 w-40 animate-pulse rounded bg-bone-300/60" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="band-light">
        <div className="shell py-24 text-center">
          <span className="eyebrow">404</span>
          <h1 className="mt-2 font-serif text-3xl sm:text-4xl">
            Watch not found
          </h1>
          <p className="mx-auto mt-3 max-w-md text-ink-500">
            This piece may have been removed from the catalogue. Browse the
            collection to find its sibling.
          </p>
          <Link href="/" className="btn-gold mt-8 inline-flex">
            Back to the showroom
          </Link>
        </div>
      </div>
    );
  }

  const brandName =
    getBrandBySlug(product.brandSlug)?.name ?? humanizeSlug(product.brandSlug);

  return (
    <div className="band-light">
      <div className="shell py-8 sm:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-xs text-ink-500">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link href="/" className="hover:text-gold">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href={`/brand/${product.brandSlug}`}
                className="hover:text-gold"
              >
                {brandName}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="truncate text-ink-700">{product.title}</li>
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <ProductGallery images={product.images} title={product.title} />

          <div className="lg:sticky lg:top-24 lg:self-start">
            <Link
              href={`/brand/${product.brandSlug}`}
              className="text-xs font-semibold uppercase tracking-label text-gold hover:text-gold-600"
            >
              {brandName}
            </Link>
            <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
              {product.title}
            </h1>
            <PriceTag
              price={product.price}
              mrp={product.mrp}
              size="lg"
              className="mt-4"
            />
            <p className="mt-5 leading-relaxed text-ink-700">
              {product.description}
            </p>

            <ProductPurchase product={product} brandName={brandName} />

            <ul className="mt-8 grid grid-cols-2 gap-3 border-t border-bone-300 pt-6 text-sm text-ink-600">
              <li>✓ 100% authentic, brand warranty</li>
              <li>✓ UPI-secure checkout</li>
              <li>✓ 7-day easy returns</li>
              <li>✓ WhatsApp order support</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
