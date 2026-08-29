import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/ProductGrid";
import { categories as seedCategories } from "@/lib/mock/categories";
import { getCategoryBySlug } from "@/lib/data/categories";
import { getProductsByCategory } from "@/lib/data/products";
import type { CategorySlug } from "@/lib/types";

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
  return seedCategories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description: category.description,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const items = await getProductsByCategory(category.slug as CategorySlug);

  return (
    <div className="band-light">
      <header className="relative h-56 overflow-hidden bg-ink text-bone sm:h-72">
        <Image
          src={category.imageUrl}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-55"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-ink/20" />
        <div className="shell relative flex h-full flex-col justify-end pb-8">
          <span className="eyebrow">Collection</span>
          <h1 className="font-serif text-3xl sm:text-5xl">{category.name}</h1>
          <p className="mt-2 max-w-xl text-bone/75">{category.description}</p>
        </div>
      </header>

      <div className="shell py-10 sm:py-14">
        <p className="mb-6 text-sm text-ink-500">
          {items.length} {items.length === 1 ? "watch" : "watches"}
        </p>
        <ProductGrid products={items} />
      </div>
    </div>
  );
}
