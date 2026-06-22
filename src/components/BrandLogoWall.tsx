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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-7">
          {brands.map((brand, i) => (
            <Reveal key={brand.id} delay={(i % 7) * 40}>
              <Link
                href={`/brand/${brand.slug}`}
                className="shine group flex h-24 items-center justify-center rounded-xl border border-bone-300 bg-bone-100 p-5 text-center text-ink-700 transition duration-300 ease-showroom hover:-translate-y-1.5 hover:border-gold hover:text-gold-600 hover:shadow-product sm:h-28"
                aria-label={`Shop ${brand.name}`}
              >
                <BrandLogo
                  brand={brand}
                  wordmarkSize="sm"
                  className="max-h-12 opacity-80 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0"
                />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
