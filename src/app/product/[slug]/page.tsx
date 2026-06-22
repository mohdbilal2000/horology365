import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { ProductGrid } from "@/components/ProductGrid";
import { PriceTag } from "@/components/PriceTag";
import { StarRating } from "@/components/ui/StarRating";
import { SectionHeader } from "@/components/SectionHeader";
import {
  getProductBySlug,
  getRelatedProducts,
  products,
} from "@/lib/mock/products";
import { getBrandBySlug } from "@/lib/mock/brands";
import { SITE } from "@/lib/config";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  const brand = getBrandBySlug(product.brandSlug);
  const cover = product.images[0];

  return {
    title: `${brand?.name ?? ""} ${product.title}`.trim(),
    description: product.description,
    openGraph: {
      title: `${brand?.name ?? ""} ${product.title}`.trim(),
      description: product.description,
      images: cover ? [{ url: cover.url, alt: cover.alt }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const brand = getBrandBySlug(product.brandSlug);
  const brandName = brand?.name ?? "";
  const related = getRelatedProducts(product);
  const inStock = product.isPreorder || product.stock > 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${brandName} ${product.title}`.trim(),
    image: product.images.map((i) => i.url),
    description: product.description,
    sku: product.id,
    brand: { "@type": "Brand", name: brandName },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${SITE.url}/product/${product.slug}`,
    },
  };

  return (
    <div className="band-light">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
              <Link href={`/brand/${product.brandSlug}`} className="hover:text-gold">
                {brandName}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="truncate text-ink-700">{product.title}</li>
          </ol>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <ProductGallery images={product.images} title={product.title} />

          <div>
            <Link
              href={`/brand/${product.brandSlug}`}
              className="text-xs font-semibold uppercase tracking-label text-gold hover:text-gold-600"
            >
              {brandName}
            </Link>
            <h1 className="mt-2 font-serif text-3xl leading-tight sm:text-4xl">
              {product.title}
            </h1>
            <StarRating
              rating={product.rating}
              reviewCount={product.reviewCount}
              size="md"
              className="mt-3"
            />
            <PriceTag
              price={product.price}
              mrp={product.mrp}
              size="lg"
              className="mt-4"
            />
            <p className="mt-5 leading-relaxed text-ink-700">{product.description}</p>

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
              <li>✓ Pay on delivery (COD)</li>
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
              viewAllHref={`/brand/${product.brandSlug}`}
            />
            <ProductGrid products={related} brandName={brandName} />
          </section>
        ) : null}
      </div>
    </div>
  );
}
