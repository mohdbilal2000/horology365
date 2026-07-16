import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import { BrandLogo } from "@/components/BrandLogo";
import { Reveal } from "@/components/ui/Reveal";
import type { Brand } from "@/lib/types";

interface BrandLogoWallProps {
  brands: Brand[];
}

export function BrandLogoWall({ brands }: BrandLogoWallProps) {
  return (
    <section id="featured-brands" className="band-light section-y">
      <div className="shell">
        <SectionHeader
          label="The Roster"
          title="Featured Brands"
          description="Fourteen houses, from everyday icons to glamour names — all authentic, all in one showroom."
          viewAllHref="#weekly-drop"
          viewAllLabel="Shop the drop"
        />
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 lg:grid-cols-7">
          {brands.map((brand, i) => (
            <Reveal key={brand.id} delay={(i % 7) * 35}>
              <Link
                href={`/brand/${brand.slug}`}
                className="shine group flex h-16 items-center justify-center overflow-hidden rounded-xl border border-bone-300 bg-bone-100 px-2.5 text-center text-ink-700 transition duration-300 ease-showroom hover:-translate-y-1 hover:border-gold hover:text-gold-600 hover:shadow-product sm:h-20 sm:px-3"
                aria-label={`Shop ${brand.name}`}
              >
                <BrandLogo
                  brand={brand}
                  wordmarkSize="sm"
                  className="max-h-8 text-[11px] leading-tight tracking-[0.06em] opacity-80 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0 sm:max-h-9 sm:text-xs"
                />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
