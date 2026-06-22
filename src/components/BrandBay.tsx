import Link from "next/link";
import { Carousel } from "@/components/ui/Carousel";
import { ProductCard } from "@/components/ProductCard";
import { BrandWordmark } from "@/components/BrandWordmark";
import { BrandLogo } from "@/components/BrandLogo";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";
import type { Brand, Product } from "@/lib/types";

interface BrandBayProps {
  brand: Brand;
  products: Product[];
  tone: "dark" | "light";
}

/** One repeatable "bay" per active brand: logo + tagline + product carousel. */
export function BrandBay({ brand, products, tone }: BrandBayProps) {
  if (products.length === 0) return null;

  return (
    <section
      className={cn("py-14 sm:py-20", tone === "dark" ? "band-dark" : "band-light")}
      aria-labelledby={`bay-${brand.slug}`}
    >
      <div className="shell">
        <Reveal className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-bone p-3 shadow-product ring-1 ring-bone-400/40">
              <BrandLogo brand={brand} wordmarkSize="sm" className="text-ink" />
            </div>
            <div>
              <span className="eyebrow">Brand Bay</span>
              <h3 id={`bay-${brand.slug}`}>
                <BrandWordmark name={brand.name} size="lg" />
              </h3>
              <p className="mt-1 text-sm text-c-60">{brand.tagline}</p>
            </div>
          </div>
          <Link
            href={`/brand/${brand.slug}`}
            className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-gold transition hover:text-gold-300"
          >
            View all
            <span
              aria-hidden="true"
              className="transition-transform duration-300 ease-showroom group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </Reveal>

        <Reveal>
          <Carousel label={`${brand.name} products`} tone={tone}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                brandName={brand.name}
                fixedWidth
              />
            ))}
          </Carousel>
        </Reveal>
      </div>
    </section>
  );
}
