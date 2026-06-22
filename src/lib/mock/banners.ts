import type { Banner } from "@/lib/types";

/**
 * Hero video slides. Pexels CDN clips are used for the demo; replace with
 * brand-shot footage in Supabase Storage for production.
 */
export const banners: Banner[] = [
  {
    id: "bn-drop",
    headline: "This Week's Drop Is Live",
    subhead:
      "Pre-order the next batch before it lands. Lock today's price, skip the wait.",
    ctaLabel: "Shop the Drop",
    ctaHref: "#weekly-drop",
    videoUrl:
      "https://videos.pexels.com/video-files/4990236/4990236-uhd_1440_2560_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1920&q=70",
    sortOrder: 1,
  },
  {
    id: "bn-brands",
    headline: "14 Brands. One Showroom.",
    subhead:
      "Casio to Michael Kors — authentic watches, UPI-secure checkout, easy returns.",
    ctaLabel: "Browse Brands",
    ctaHref: "#featured-brands",
    videoUrl:
      "https://videos.pexels.com/video-files/5532771/5532771-hd_1080_1920_25fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1434056886845-dac89ffe9b56?auto=format&fit=crop&w=1920&q=70",
    sortOrder: 2,
  },
  {
    id: "bn-sale",
    headline: "Up to 30% Off Marked Price",
    subhead: "Real discounts on real watches. No inflated MRP games.",
    ctaLabel: "View Offers",
    ctaHref: "#offers",
    videoUrl:
      "https://videos.pexels.com/video-files/7710243/7710243-hd_1080_1920_30fps.mp4",
    posterUrl:
      "https://images.unsplash.com/photo-1526045431048-f857369baa09?auto=format&fit=crop&w=1920&q=70",
    sortOrder: 3,
  },
];

export const activeBanners = [...banners].sort(
  (a, b) => a.sortOrder - b.sortOrder,
);
