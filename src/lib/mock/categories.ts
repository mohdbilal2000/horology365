import type { Category } from "@/lib/types";

export const categories: Category[] = [
  {
    id: "cat-mens",
    slug: "mens-watches",
    name: "Men's Watches",
    description:
      "Chronographs, divers and dress watches built for the everyday and the occasion.",
    imageUrl:
      "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=1200&q=70",
  },
  {
    id: "cat-womens",
    slug: "womens-watches",
    name: "Women's Watches",
    description:
      "Slim silhouettes, jewellery dials and bracelets that finish every look.",
    // Watch-only imagery — the category tiles must never show clothing.
    imageUrl:
      "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1200&q=70",
  },
];

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}
