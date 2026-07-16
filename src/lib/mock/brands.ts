import type { Brand } from "@/lib/types";

/**
 * Brand logos are self-hosted in /public/logos (downloaded from Wikimedia,
 * served same-origin so they never break). Brands without a logo render an
 * elegant wordmark via <BrandLogo>. Swap for Supabase Storage URLs in Phase 2.
 */
const cover = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=70`;

export const brands: Brand[] = [
  {
    id: "br-casio",
    slug: "casio",
    name: "Casio",
    tagline: "Tough, iconic, built to outlast trends.",
    logoUrl: "/logos/casio.svg",
    coverUrl: cover("1523275335684-37898b6baf30"),
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "br-timex",
    slug: "timex",
    name: "Timex",
    tagline: "American heritage. Honest timekeeping.",
    logoUrl: "/logos/timex.svg",
    coverUrl: cover("1524805444758-089113d48a6d"),
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "br-armani-exchange",
    slug: "armani-exchange",
    name: "Armani Exchange",
    tagline: "Milan attitude on your wrist.",
    logoUrl: "/logos/armani-exchange.svg",
    coverUrl: cover("1547996160-81dfa63595aa"),
    isActive: true,
    sortOrder: 5,
  },
  {
    id: "br-titan",
    slug: "titan",
    name: "Titan",
    tagline: "India's most trusted watchmaker.",
    logoUrl: "/logos/titan.svg",
    coverUrl: cover("1434056886845-dac89ffe9b56"),
    isActive: true,
    sortOrder: 4,
  },
  {
    id: "br-fastrack",
    slug: "fastrack",
    name: "Fastrack",
    tagline: "Move on. Bold watches for the restless.",
    logoUrl: "",
    coverUrl: cover("1508057198894-247b23fe5ade"),
    isActive: true,
    sortOrder: 6,
  },
  {
    id: "br-sonata",
    slug: "sonata",
    name: "Sonata",
    tagline: "Everyday value, dependable style.",
    logoUrl: "",
    coverUrl: cover("1523170335258-f5ed11844a49"),
    isActive: true,
    sortOrder: 3,
  },
  {
    id: "br-fossil",
    slug: "fossil",
    name: "Fossil",
    tagline: "Vintage American design, modern soul.",
    logoUrl: "/logos/fossil.svg",
    coverUrl: cover("1622434641406-a158123450f9"),
    isActive: true,
    sortOrder: 7,
  },
  {
    id: "br-diesel",
    slug: "diesel",
    name: "Diesel",
    tagline: "Oversized, fearless, unmistakable.",
    logoUrl: "/logos/diesel.png",
    coverUrl: cover("1542496658-e33a6d0d50f6"),
    isActive: true,
    sortOrder: 8,
  },
  {
    id: "br-michael-kors",
    slug: "michael-kors",
    name: "Michael Kors",
    tagline: "Glamour, jet-set, effortlessly luxe.",
    logoUrl: "/logos/michael-kors.svg",
    coverUrl: cover("1526045431048-f857369baa09"),
    isActive: true,
    sortOrder: 9,
  },
  {
    id: "br-guess",
    slug: "guess",
    name: "Guess",
    tagline: "Sparkle, swagger, statement dials.",
    logoUrl: "/logos/guess.svg",
    coverUrl: cover("1518131672697-613becd4fab5"),
    isActive: true,
    sortOrder: 10,
  },
  {
    id: "br-lacoste",
    slug: "lacoste",
    name: "Lacoste",
    tagline: "Court-ready sport, French ease.",
    logoUrl: "/logos/lacoste.svg",
    coverUrl: cover("1612817159949-195b6eb9e31a"),
    isActive: true,
    sortOrder: 11,
  },
  {
    id: "br-french-connection",
    slug: "french-connection",
    name: "French Connection",
    tagline: "Minimal London cool.",
    logoUrl: "/logos/french-connection.svg",
    coverUrl: cover("1539874754764-5a96559165b0"),
    isActive: true,
    sortOrder: 12,
  },
  {
    id: "br-carter-london",
    slug: "carter-london",
    name: "Carter London",
    tagline: "Affordable British dress watches.",
    logoUrl: "",
    coverUrl: cover("1614164185128-e4ec99c436d7"),
    isActive: true,
    sortOrder: 13,
  },
  {
    id: "br-titan-raga",
    slug: "titan-raga",
    name: "Titan Raga",
    tagline: "Jewellery for the modern woman.",
    logoUrl: "",
    coverUrl: cover("1522312346375-d1a52e2b99b3"),
    isActive: true,
    sortOrder: 14,
  },
];

export const activeBrands = brands
  .filter((b) => b.isActive)
  .sort((a, b) => a.sortOrder - b.sortOrder);

export function getBrandBySlug(slug: string): Brand | undefined {
  return brands.find((b) => b.slug === slug);
}
