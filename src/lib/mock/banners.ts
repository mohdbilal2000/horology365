import type { Banner } from "@/lib/types";

/**
 * Hero slides. Each slide showcases a real watch from the catalog (resolved
 * by `productSlug`) over an ambient, muted free-stock video.
 *
 * Video sources are CC0 / hotlink-safe (Pixabay + MDN cc0 + samplelib); every
 * slide also has an Unsplash poster, so the hero is always crisp even if a
 * video is slow or blocked. Swap for brand-shot footage in Supabase Storage
 * for production.
 */
export const banners: Banner[] = [
  {
    id: "bn-drop",
    eyebrow: "This Week's Drop",
    headline: "The Drop Is Live",
    subhead:
      "Pre-order the next batch before it lands. Lock today's price, skip the wait.",
    ctaLabel: "Shop the Drop",
    ctaHref: "#weekly-drop",
    videoUrl: "/videos/watch-1.mp4",
    posterUrl: "/posters/watch-1.jpg",
    productSlug: "casio-g-shock-ga2100",
    sortOrder: 1,
  },
  {
    id: "bn-glam",
    eyebrow: "Editor's Pick",
    headline: "Jet-Set Glamour",
    subhead:
      "Pavé dials and gold-tone steel from Michael Kors — effortless, everyday luxe.",
    ctaLabel: "Shop the Look",
    ctaHref: "/brand/michael-kors",
    videoUrl: "/videos/watch-4.mp4",
    posterUrl: "/posters/watch-4.jpg",
    productSlug: "mk-lexington-gold",
    sortOrder: 2,
  },
  {
    id: "bn-slim",
    eyebrow: "Up to 30% Off",
    headline: "Quietly Iconic",
    subhead:
      "The ultra-slim Titan Edge — real discounts on real watches, no inflated MRP games.",
    ctaLabel: "View Offers",
    ctaHref: "#offers",
    videoUrl: "/videos/watch-2.mp4",
    posterUrl: "/posters/watch-2.jpg",
    productSlug: "titan-edge-ceramic",
    sortOrder: 3,
  },
];

export const activeBanners = [...banners].sort(
  (a, b) => a.sortOrder - b.sortOrder,
);
