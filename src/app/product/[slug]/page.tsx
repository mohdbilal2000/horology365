import type { Metadata } from "next";
import { ProductDetail } from "@/components/product/ProductDetail";
import { AdminProductPage } from "@/components/product/AdminProductPage";
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
  if (!product) return { title: "Product" };
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

  // Not in the static catalogue — it may be a product saved through /admin,
  // which only exists in the browser's localStorage. Hand off to a client
  // component that looks it up there once mounted.
  if (!product) {
    return <AdminProductPage slug={slug} />;
  }

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
      <ProductDetail product={product} brandName={brandName} related={related} />
    </div>
  );
}
