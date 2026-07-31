import Link from "next/link";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { ProductGrid } from "@/components/ProductGrid";
import { PriceTag } from "@/components/PriceTag";
import { StarRating } from "@/components/ui/StarRating";
import { SectionHeader } from "@/components/SectionHeader";
import type { Product } from "@/lib/types";

interface ProductDetailProps {
  product: Product;
  brandName: string;
  related: Product[];
  /** Omitted when the brand has no collection page yet (admin-added brands). */
  brandHref?: string;
  /** Product JSON-LD, rendered only for the statically-generated catalog. */
  jsonLd?: Record<string, unknown>;
}

/**
 * The product page body. Shared by the seeded catalog (server-rendered, with
 * JSON-LD) and by admin-added products, which resolve on the client.
 */
export function ProductDetail({
  product,
  brandName,
  related,
  brandHref,
  jsonLd,
}: ProductDetailProps) {
  return (
    <div className="band-light">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

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
              {brandHref ? (
                <Link href={brandHref} className="hover:text-gold">
                  {brandName}
                </Link>
              ) : (
                brandName
              )}
            </li>
            <li aria-hidden="true">/</li>
            <li className="truncate text-ink-700">{product.title}</li>
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <ProductGallery
            images={product.images}
            title={product.title}
            videoUrl={product.videoUrl}
            videoPoster={product.videoPoster}
          />

          <div className="lg:sticky lg:top-24 lg:self-start">
            {brandHref ? (
              <Link
                href={brandHref}
                className="text-xs font-semibold uppercase tracking-label text-gold hover:text-gold-600"
              >
                {brandName}
              </Link>
            ) : (
              <span className="text-xs font-semibold uppercase tracking-label text-gold">
                {brandName}
              </span>
            )}
            <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
              {product.title}
            </h1>
            {product.reviewCount > 0 ? (
              <StarRating
                rating={product.rating}
                reviewCount={product.reviewCount}
                size="md"
                className="mt-3"
              />
            ) : (
              <span className="mt-3 inline-block rounded-full bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold-700">
                New arrival
              </span>
            )}
            <PriceTag
              price={product.price}
              mrp={product.mrp}
              size="lg"
              className="mt-4"
            />
            {product.description ? (
              <p className="mt-5 leading-relaxed text-ink-700">
                {product.description}
              </p>
            ) : null}

            {product.tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-bone-400 px-2.5 py-1 text-xs capitalize text-ink-600"
                  >
                    {tag.replace(/-/g, " ")}
                  </span>
                ))}
              </div>
            ) : null}

            <ProductPurchase product={product} brandName={brandName} />

            <ul className="mt-8 grid grid-cols-2 gap-3 border-t border-bone-300 pt-6 text-sm text-ink-600">
              <li>✓ 100% authentic, brand warranty</li>
              <li>✓ UPI-secure checkout</li>
              <li>✓ 7-day easy returns</li>
              <li>✓ WhatsApp order support</li>
            </ul>
          </div>
        </div>

        {related.length > 0 ? (
          <section className="mt-16 sm:mt-24">
            <SectionHeader
              label="You may also like"
              title={`More from ${brandName}`}
              viewAllHref={brandHref}
            />
            <ProductGrid products={related} brandName={brandName} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
