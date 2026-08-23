import type { Category } from "@/lib/types";

export const categories: Category[] = [
  {
    id: "cat-mens",
    slug: "mens-watches",
    name: "Men's Watches",
    description:
      "Chronographs, divers and dress watches built for the everyday and the occasion.",
    // Black-and-gold chronograph on a dark ground — moody, premium hero shot.
    imageUrl:
      "https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "cat-womens",
    slug: "womens-watches",
    name: "Women's Watches",
    description:
      "Slim silhouettes, jewellery dials and bracelets that finish every look.",
    // Rose-gold, mother-of-pearl bracelet watch on the wrist. Self-hosted so a
    // key homepage tile never depends on a third-party CDN staying up.
    imageUrl: "/posters/womens-watch.jpg",
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
