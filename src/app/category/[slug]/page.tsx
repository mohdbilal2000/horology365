import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AdminAwareProductGrid } from "@/components/AdminAwareProductGrid";
import { categories, getCategoryBySlug } from "@/lib/mock/categories";
import { getProductsByCategory } from "@/lib/mock/products";
import type { CategorySlug } from "@/lib/types";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description: category.description,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();

  const items = getProductsByCategory(category.slug as CategorySlug);

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
        <AdminAwareProductGrid
          products={items}
          categorySlug={category.slug as CategorySlug}
          showCount
        />
      </div>
    </div>
  );
}
