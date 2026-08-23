import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/ProductDetail";
import { products as seedProducts } from "@/lib/mock/products";
import { getProductBySlug, getRelatedProducts } from "@/lib/data/products";
import { getBrandBySlug } from "@/lib/data/brands";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Re-fetch from Supabase at most once per this many seconds, so admin
// catalog changes show up without a redeploy — see the admin write routes
// for the complementary on-demand revalidation.
// One hour, not one minute. Every admin write already calls
// revalidateCatalog(), so an edit is live immediately and this timer only
// exists as a backstop for changes made outside the admin. At 60s each of the
// ~63 catalogue pages regenerated every minute under crawler traffic — about
// 90,000 ISR writes a day, which is what blew the hosting quota. Nothing here
// changes how fast an admin edit appears.
export const revalidate = 3600;

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
