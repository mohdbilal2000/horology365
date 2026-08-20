import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { resolveOffers } from "@/components/OfferCard";
import type { Offer } from "@/lib/types";

interface OfferBandProps {
  offers: Offer[];
}

/**
 * Compact promo strip for the homepage — a stack of deal thumbnails plus one
 * clear "View all offers" button, instead of a full product grid. Keeps the
 * homepage short; every deal itself lives on the dedicated /offers page.
 */
export function OfferBand({ offers }: OfferBandProps) {
  const resolved = resolveOffers(offers);
  if (resolved.length === 0) return null;

  const preview = resolved.slice(0, 5);

  return (
    <section id="offers" className="band-dark aurora grain relative overflow-hidden">
      <div className="shell relative z-[2] flex flex-col items-center gap-6 py-12 text-center sm:flex-row sm:items-center sm:justify-between sm:py-14 sm:text-left">
        <Reveal>
          <span className="eyebrow inline-flex items-center justify-center gap-2 sm:justify-start">
            <span className="h-px w-6 bg-gold" aria-hidden="true" />
            Marked Down
          </span>
          <h2 className="t-h2 mt-3">Offers &amp; Deals</h2>
          <p className="t-lead mt-2 max-w-md text-bone/60">
            {resolved.length} watches marked down right now — honest MRP, no
            inflated strike-throughs.
          </p>
        </Reveal>

        <Reveal delay={80}>
          <div className="flex flex-col items-center gap-4 sm:items-end">
            <div className="flex -space-x-3" aria-hidden="true">
              {preview.map(({ offer, product }) => {
                const cover = product.images[0];
                return (
                  <span
                    key={offer.id}
                    className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-ink bg-ink-600 ring-1 ring-white/10"
                  >
                    {cover ? (
                      <Image
                        src={cover.url}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : null}
                  </span>
                );
              })}
            </div>
            <Link href="/offers" className="btn-gold">
              View all offers →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
