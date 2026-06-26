import type { Banner } from "@/lib/types";

/**
 * Hero slides — Casio-led (the brand we deal in most), then the rest.
 * Each slide showcases a real catalog watch over a muted watch video. Videos
 * are non-branded close-ups self-hosted in /public (no competitor branding);
 * swap in real Casio footage at /public/videos/watch-*.mp4 anytime.
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
    videoUrl: "/videos/watch-1.mp4",
    posterUrl: "/posters/watch-1.jpg",
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
    videoUrl: "/videos/watch-8.mp4",
    posterUrl: "/posters/watch-8.jpg",
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
    videoUrl: "/videos/watch-2.mp4",
    posterUrl: "/posters/watch-2.jpg",
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
