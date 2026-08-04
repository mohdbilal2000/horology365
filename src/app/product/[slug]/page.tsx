import type { Metadata } from "next";
import { ProductDetail } from "@/components/product/ProductDetail";
import { AdminProductDetail } from "@/components/product/AdminProductDetail";
import {
  getProductBySlug,
  getRelatedProducts,
  products,
} from "@/lib/mock/products";
import { getBrandBySlug } from "@/lib/mock/brands";

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

  // Not in the static seed catalogue — fall back to resolving it against
  // this browser's admin-added products (client-side, localStorage-backed).
  if (!product) return <AdminProductDetail slug={slug} />;

  const brand = getBrandBySlug(product.brandSlug);
  const brandName = brand?.name ?? "";
  const related = getRelatedProducts(product);

  return <ProductDetail product={product} brandName={brandName} related={related} />;
}
