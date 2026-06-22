import Image from "next/image";
import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import type { Category } from "@/lib/types";

interface CategoryBlockProps {
  categories: Category[];
}

export function CategoryBlock({ categories }: CategoryBlockProps) {
  return (
    <section className="band-light py-14 sm:py-20">
      <div className="shell">
        <SectionHeader label="Find Your Fit" title="Shop by Category" />
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
          {categories.map((category, i) => (
            <Reveal key={category.id} delay={i * 80}>
              <Link
                href={`/category/${category.slug}`}
                className="group relative block aspect-[16/10] overflow-hidden rounded-2xl"
                aria-label={`Shop ${category.name}`}
              >
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-700 ease-showroom group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/25 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-6 text-bone sm:p-8">
                  <span className="eyebrow">Collection</span>
                  <h3 className="mt-1 font-serif text-2xl sm:text-3xl">
                    {category.name}
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-bone/75">
                    {category.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-gold">
                    Shop now
                    <span
                      aria-hidden="true"
                      className="transition-transform duration-300 ease-showroom group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
