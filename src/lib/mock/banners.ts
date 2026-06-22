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
    videoUrl: "https://cdn.pixabay.com/video/2020/08/30/48569-454825064_large.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=1920&q=70",
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
    videoUrl:
      "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1526045431048-f857369baa09?auto=format&fit=crop&w=1920&q=70",
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
    videoUrl: "https://download.samplelib.com/mp4/sample-5s.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?auto=format&fit=crop&w=1920&q=70",
    productSlug: "titan-edge-ceramic",
    sortOrder: 3,
  },
];

export const activeBanners = [...banners].sort(
  (a, b) => a.sortOrder - b.sortOrder,
);
