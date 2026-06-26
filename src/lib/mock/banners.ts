import type { Banner } from "@/lib/types";

/**
 * Hero slides — Casio-led (the brand we deal in most), then the rest.
 * The Casio slides play real Casio G-Shock footage (casio-*.mp4); as a reseller
 * we showcase the actual product. Remaining slides use generic watch clips.
 * All videos are self-hosted in /public/videos with posters in /public/posters.
 */
export const banners: Banner[] = [
  {
    id: "bn-gshock",
    eyebrow: "This Week's Drop",
    headline: "The Drop Is Live",
    subhead:
      "Pre-order the next batch before it lands. Lock today's price, skip the wait.",
    ctaLabel: "Shop the Drop",
    ctaHref: "#weekly-drop",
    videoUrl: "/videos/casio-3.mp4",
    posterUrl: "/posters/casio-3.jpg",
    productSlug: "casio-g-shock-ga2100",
    sortOrder: 1,
  },
  {
    id: "bn-casio-vintage",
    eyebrow: "Casio · 60% Off",
    headline: "The Retro Icon",
    subhead:
      "The Casio Vintage that never went out of style — steel, digital, indestructible.",
    ctaLabel: "Shop Casio",
    ctaHref: "/brand/casio",
    videoUrl: "/videos/casio-1.mp4",
    posterUrl: "/posters/casio-1.jpg",
    productSlug: "casio-vintage-a168",
    sortOrder: 2,
  },
  {
    id: "bn-glam",
    eyebrow: "Editor's Pick",
    headline: "Jet-Set Glamour",
    subhead:
      "Pavé dials and gold-tone steel from Michael Kors — effortless, everyday luxe.",
    ctaLabel: "Shop the Look",
    ctaHref: "/brand/michael-kors",
    videoUrl: "/videos/watch-6.mp4",
    posterUrl: "/posters/watch-6.jpg",
    productSlug: "mk-lexington-gold",
    sortOrder: 3,
  },
  {
    id: "bn-casio-edifice",
    eyebrow: "Casio · 60% Off",
    headline: "Built For Speed",
    subhead:
      "The Casio Edifice chronograph — motorsport looks at a fraction of the price.",
    ctaLabel: "Shop Casio",
    ctaHref: "/brand/casio",
    videoUrl: "/videos/casio-2.mp4",
    posterUrl: "/posters/casio-2.jpg",
    productSlug: "casio-edifice-efr",
    sortOrder: 4,
  },
  {
    id: "bn-slim",
    eyebrow: "Up to 30% Off",
    headline: "Quietly Iconic",
    subhead:
      "The ultra-slim Titan Edge — real discounts on real watches, no inflated MRP games.",
    ctaLabel: "View Offers",
    ctaHref: "#offers",
    videoUrl: "/videos/watch-3.mp4",
    posterUrl: "/posters/watch-3.jpg",
    productSlug: "titan-edge-ceramic",
    sortOrder: 5,
  },
];

export const activeBanners = [...banners].sort(
  (a, b) => a.sortOrder - b.sortOrder,
);
