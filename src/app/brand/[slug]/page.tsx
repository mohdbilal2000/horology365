import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/ProductGrid";
import { BrandLogo } from "@/components/BrandLogo";
import { activeBrands as seedActiveBrands } from "@/lib/mock/brands";
import { getBrandBySlug } from "@/lib/data/brands";
import { getProductsByBrand } from "@/lib/data/products";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Re-fetch the catalogue at most once per this many seconds, so admin
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
  return seedActiveBrands.map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand?.isActive) return { title: "Brand not found" };
  return {
    title: `${brand.name} Watches`,
    description: `Shop authentic ${brand.name} watches — ${brand.tagline}`,
  };
}

export default async function BrandPage({ params }: PageProps) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  // Delisted brands 404 — their pages disappear along with their products.
  if (!brand?.isActive) notFound();

  const items = await getProductsByBrand(brand.slug);

  return (
    <div className="band-light">
      {/* Brand hero */}
      <header className="relative h-64 overflow-hidden bg-ink text-bone sm:h-80">
        <Image
          src={brand.coverUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20" />
        <div className="shell relative flex h-full flex-col justify-end pb-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-bone p-3 shadow-product">
              <BrandLogo brand={brand} monogram className="text-ink" />
            </div>
            <div>
              <span className="eyebrow">Brand Collection</span>
              <h1 className="font-serif text-3xl uppercase tracking-[0.12em] sm:text-5xl">
                {brand.name}
              </h1>
            </div>
          </div>
          <p className="mt-3 max-w-xl text-bone/75">{brand.tagline}</p>
        </div>
      </header>

      <div className="shell py-10 sm:py-14">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-ink-500">
            {items.length} {items.length === 1 ? "watch" : "watches"}
          </p>
        </div>
        <ProductGrid products={items} brandName={brand.name} />
      </div>
    </div>
  );
}
