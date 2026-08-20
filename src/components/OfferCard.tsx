import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { PriceTag } from "@/components/PriceTag";
import { getBrandBySlug } from "@/lib/mock/brands";
import { getProductBySlug } from "@/lib/mock/products";
import type { Offer, Product } from "@/lib/types";

export interface ResolvedOffer {
  offer: Offer;
  product: Product;
  brandName: string;
}

/** Pair each offer with its product; offers pointing nowhere are dropped. */
export function resolveOffers(offers: Offer[]): ResolvedOffer[] {
  return offers
    .map((offer) => {
      const product = getProductBySlug(offer.productSlug);
      if (!product) return null;
      const brand = getBrandBySlug(product.brandSlug);
      return { offer, product, brandName: brand?.name ?? "" };
    })
    .filter((x): x is ResolvedOffer => x !== null);
}

/** Single deal tile — used on the home band and on the full /offers page. */
export function OfferCard({
  offer,
  product,
  brandName,
  delay = 0,
}: ResolvedOffer & { delay?: number }) {
  const cover = product.images[0];
  return (
    <Reveal delay={delay}>
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
          <span className="absolute left-3 top-3 rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink">
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
}
