import type { Category } from "@/lib/types";

export const categories: Category[] = [
  {
    id: "cat-mens",
    slug: "mens-watches",
    name: "Men's Watches",
    description:
      "Chronographs, divers and dress watches built for the everyday and the occasion.",
    // Watch-only imagery — black-and-gold chronograph on a dark ground,
    // a moody premium hero shot.
    imageUrl:
      "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "cat-womens",
    slug: "womens-watches",
    name: "Women's Watches",
    description:
      "Slim silhouettes, jewellery dials and bracelets that finish every look.",
    // A rose-gold, mother-of-pearl bracelet watch on the wrist. The previous
    // image was a men's Rolex diver — wrong gender, and a brand we don't sell.
    // Self-hosted so a key homepage tile never depends on a third-party CDN,
    // and cropped so the watch sits clear of the tile's heading.
    imageUrl: "/posters/womens-watch.jpg",
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
