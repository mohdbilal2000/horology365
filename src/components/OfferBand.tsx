import Image from "next/image";
import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { PriceTag } from "@/components/PriceTag";
import { getBrandBySlug } from "@/lib/mock/brands";
import { getProductBySlug } from "@/lib/mock/products";
import type { Offer } from "@/lib/types";

interface OfferBandProps {
  offers: Offer[];
}

/** Bold sale band — strikethrough MRP vs sale price, gold badges. */
export function OfferBand({ offers }: OfferBandProps) {
  const resolved = offers
    .map((offer) => {
      const product = getProductBySlug(offer.productSlug);
      if (!product) return null;
      const brand = getBrandBySlug(product.brandSlug);
      return { offer, product, brandName: brand?.name ?? "" };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (resolved.length === 0) return null;

  return (
    <section id="offers" className="band-dark aurora grain relative overflow-hidden section-y">
      <div className="shell relative z-[2]">
        <SectionHeader
          label="Marked Down"
          title="Offers & Sale"
          description="Real reductions on real watches — honest MRP, no inflated strike-throughs."
          viewAllHref="/category/mens-watches"
          viewAllLabel="See all deals"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {resolved.map(({ offer, product, brandName }, i) => {
            const cover = product.images[0];
            return (
              <Reveal key={offer.id} delay={(i % 4) * 60}>
                <Link
                  href={`/product/${product.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-bone/10 bg-ink-700 transition duration-300 ease-showroom hover:-translate-y-1 hover:border-gold/60 hover:shadow-product-hover"
                >
                  <div className="product-frame aspect-[4/3] bg-ink-600">
                    {cover ? (
                      <Image
                        src={cover.url}
                        alt={cover.alt}
                        fill
                        sizes="(max-width: 640px) 100vw, 25vw"
                        className="object-cover transition-transform duration-500 ease-showroom group-hover:scale-105"
                      />
                    ) : null}
                    <span className="absolute left-3 top-3 rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      {offer.badge}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <span className="text-[11px] font-semibold uppercase tracking-label text-bone/50">
                      {brandName}
                    </span>
                    <p className="mt-1 line-clamp-1 font-medium">{offer.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-sm text-bone/60">
                      {offer.subtitle}
                    </p>
                    <PriceTag
                      price={product.price}
                      mrp={product.mrp}
                      size="md"
                      badge
                      className="mt-3"
                    />
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
