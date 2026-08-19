import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { OfferCard, resolveOffers } from "@/components/OfferCard";
import { offers } from "@/lib/mock";
import { discountPercent } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Offers & Deals",
  description:
    "Every live Horology365 deal in one place — genuine markdowns on Casio, Titan, Fossil, Timex and more.",
};

export default function OffersPage() {
  const resolved = resolveOffers(offers);
  const biggest = resolved.reduce(
    (best, { product }) =>
      Math.max(best, discountPercent(product.mrp, product.price)),
    0,
  );

  return (
    <>
      <PageHeader
        label="Offers & Deals"
        title="Every live deal, in one place."
        intro={
          resolved.length
            ? `${resolved.length} watches marked down right now — up to ${biggest}% off MRP. Genuine stock, sealed boxes, brand warranty.`
            : "No deals are running right now — check back soon."
        }
      />

      <section className="band-dark aurora grain relative overflow-hidden section-y">
        <div className="shell relative z-[2]">
          {resolved.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {resolved.map(({ offer, product, brandName }, i) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  product={product}
                  brandName={brandName}
                  delay={(i % 4) * 60}
                />
              ))}
            </div>
          ) : (
            <p className="text-bone/70">
              Nothing on sale at the moment. New markdowns land every week.
            </p>
          )}

          <div className="mt-12 flex flex-wrap justify-center gap-3">
            <Link href="/category/mens-watches" className="btn-gold">
              Shop men&apos;s watches
            </Link>
            <Link
              href="/category/womens-watches"
              className="inline-flex items-center gap-2 rounded-full border border-bone/25 px-5 py-3 text-sm font-semibold text-bone transition hover:border-gold hover:text-gold"
            >
              Shop women&apos;s watches
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
