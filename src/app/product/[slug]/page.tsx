import type { Metadata } from "next";
import { ProductDetail } from "@/components/product/ProductDetail";
import { AdminProductView } from "@/components/product/AdminProductView";
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
  // Admin-added products resolve in the browser, so there's nothing to render
  // metadata from here — and nothing worth indexing either.
  if (!product) {
    return { title: "Product", robots: { index: false, follow: true } };
  }
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

  // Not in the seeded catalog — it may be a product added from /admin.
  if (!product) return <AdminProductView slug={slug} />;

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
    <ProductDetail
      product={product}
      brandName={brandName}
      related={related}
      brandHref={`/brand/${product.brandSlug}`}
      jsonLd={jsonLd}
    />
  );
}
