import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import { OfferCard, resolveOffers } from "@/components/OfferCard";
import type { Offer } from "@/lib/types";

interface OfferBandProps {
  offers: Offer[];
  /**
   * How many deals the band shows inline. The rest live on /offers so the home
   * page stays short — customers shouldn't have to scroll past every deal to
   * reach the footer.
   */
  limit?: number;
}

/** Bold sale band — a teaser row of deals that opens the full offers page. */
export function OfferBand({ offers, limit = 4 }: OfferBandProps) {
  const resolved = resolveOffers(offers);
  if (resolved.length === 0) return null;

  const shown = resolved.slice(0, limit);
  const hidden = resolved.length - shown.length;

  return (
    <section id="offers" className="band-dark aurora grain relative overflow-hidden section-y">
      <div className="shell relative z-[2]">
        <SectionHeader
          label="Marked Down"
          title="Offers & Deals"
          description="Real reductions on real watches — honest MRP, no inflated strike-throughs."
          viewAllHref="/offers"
          viewAllLabel={
            hidden > 0 ? `See all ${resolved.length} deals` : "See all deals"
          }
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map(({ offer, product, brandName }, i) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              product={product}
              brandName={brandName}
              delay={(i % 4) * 60}
            />
          ))}
        </div>

        {hidden > 0 ? (
          <div className="mt-8 flex justify-center">
            <Link href="/offers" className="btn-gold">
              See all {resolved.length} offers &amp; deals →
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
