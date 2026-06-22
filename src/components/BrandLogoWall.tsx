import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import { BrandWordmark } from "@/components/BrandWordmark";
import { Reveal } from "@/components/ui/Reveal";
import type { Brand } from "@/lib/types";

interface BrandLogoWallProps {
  brands: Brand[];
}

export function BrandLogoWall({ brands }: BrandLogoWallProps) {
  return (
    <section id="featured-brands" className="band-light py-14 sm:py-20">
      <div className="shell">
        <SectionHeader
          label="The Roster"
          title="Featured Brands"
          viewAllHref="#weekly-drop"
          viewAllLabel="Shop the drop"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-7">
          {brands.map((brand, i) => (
            <Reveal key={brand.id} delay={(i % 7) * 40}>
              <Link
                href={`/brand/${brand.slug}`}
                className="group flex h-24 items-center justify-center rounded-xl border border-bone-300 bg-bone-100 p-5 text-center text-ink-600 transition duration-300 ease-showroom hover:-translate-y-1 hover:border-gold hover:text-ink hover:shadow-product sm:h-28"
                aria-label={`Shop ${brand.name}`}
              >
                <BrandWordmark name={brand.name} size="sm" className="transition group-hover:text-gold-600" />
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
