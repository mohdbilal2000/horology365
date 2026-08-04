import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/ProductDetail";
import { products as seedProducts } from "@/lib/mock/products";
import { getProductBySlug, getRelatedProducts } from "@/lib/data/products";
import { getBrandBySlug } from "@/lib/data/brands";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return seedProducts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  const brand = await getBrandBySlug(product.brandSlug);
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
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const brand = await getBrandBySlug(product.brandSlug);
  const brandName = brand?.name ?? "";
  const related = await getRelatedProducts(product);

  return <ProductDetail product={product} brandName={brandName} related={related} />;
}
