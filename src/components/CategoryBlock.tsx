import Image from "next/image";
import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";
import type { Category } from "@/lib/types";

interface CategoryBlockProps {
  categories: Category[];
}

/**
 * Bento composition — one large primary tile + stacked secondary tiles, sized
 * on a 3×2 grid so the proportions stay deliberate rather than uniform.
 */
export function CategoryBlock({ categories }: CategoryBlockProps) {
  const mens = categories.find((c) => c.slug === "mens-watches") ?? categories[0];
  const womens =
    categories.find((c) => c.slug === "womens-watches") ?? categories[1];
  if (!mens) return null;

  return (
    <section className="band-light section-y">
      <div className="shell">
        <SectionHeader
          label="Find Your Fit"
          title="Shop by Category"
          description="Two collections, one standard of finish. Start where your wrist leads."
        />
        <Reveal>
          <div className="grid auto-rows-[180px] grid-cols-1 gap-4 sm:auto-rows-[200px] sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {/* Primary — large */}
            <CategoryTile
              href={`/category/${mens.slug}`}
              title={mens.name}
              copy={mens.description}
              image={mens.imageUrl}
              eyebrow="Collection"
              className="sm:col-span-2 sm:row-span-2"
              big
            />
            {/* Secondary */}
            {womens ? (
              <CategoryTile
                href={`/category/${womens.slug}`}
                title={womens.name}
                copy={womens.description}
                image={womens.imageUrl}
                eyebrow="Collection"
                className="lg:row-span-1"
              />
            ) : null}
            {/* Promo tile — the drop. Real G-Shock product still, not a generic macro. */}
            <CategoryTile
              href="/#weekly-drop"
              title="This Week's Drop"
              copy="Pre-order the next batch — lock today's price."
              image="/posters/casio-3.jpg"
              eyebrow="Pre-order"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function CategoryTile({
  href,
  title,
  copy,
  image,
  eyebrow,
  className,
  big = false,
}: {
  href: string;
  title: string;
  copy: string;
  image: string;
  eyebrow: string;
  className?: string;
  big?: boolean;
}) {
  return (
    <Reveal as="div" className={cn("h-full", className)}>
      <Link
        href={href}
        className="group relative flex h-full w-full items-end overflow-hidden rounded-3xl"
        aria-label={`Shop ${title}`}
      >
        <Image
          src={image}
          alt={title}
          fill
          sizes={big ? "(max-width: 640px) 100vw, 66vw" : "(max-width: 640px) 100vw, 33vw"}
          className="object-cover transition-transform duration-700 ease-showroom group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/25 to-transparent" />
        <div className={cn("relative p-5", big && "p-7 sm:p-9")}>
          <span className="text-[11px] font-semibold uppercase tracking-label text-gold-300">
            {eyebrow}
          </span>
          <h3 className={cn("mt-1 text-bone", big ? "t-h2" : "t-h3")}>{title}</h3>
          <p
            className={cn(
              "mt-1 max-w-sm text-bone/70",
              big ? "text-sm sm:text-base" : "hidden text-sm sm:line-clamp-2 sm:block",
            )}
          >
            {copy}
          </p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-200">
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
  );
}
