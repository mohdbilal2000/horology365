import Image from "next/image";
import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
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
                className="group flex h-24 items-center justify-center rounded-xl border border-bone-300 bg-bone-100 p-5 transition duration-300 ease-showroom hover:-translate-y-1 hover:border-gold hover:shadow-product sm:h-28"
                aria-label={`Shop ${brand.name}`}
              >
                <span className="relative block h-full w-full">
                  <Image
                    src={brand.logoUrl}
                    alt={`${brand.name} logo`}
                    fill
                    sizes="160px"
                    className="object-contain opacity-80 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0"
                  />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
