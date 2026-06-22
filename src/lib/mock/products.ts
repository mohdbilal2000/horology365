import type { CategorySlug, Product } from "@/lib/types";

/**
 * Shared Unsplash watch photography pool. Every product uses the same
 * treatment (clean crop, soft shadow) so the showroom reads consistent.
 */
const PHOTOS = [
  "1524592094714-0f0654e20314",
  "1523275335684-37898b6baf30",
  "1547996160-81dfa63595aa",
  "1434056886845-dac89ffe9b56",
  "1508057198894-247b23fe5ade",
  "1495856458515-0637185db551",
  "1533139502658-0198f920d8e8",
  "1542496658-e33a6d0d50f6",
  "1526045431048-f857369baa09",
  "1518131672697-613becd4fab5",
  "1612817159949-195b6eb9e31a",
  "1539874754764-5a96559165b0",
  "1614164185128-e4ec99c436d7",
  "1535632066927-ab7c9ab60908",
  "1587836374828-4dbafa94cf0e",
  "1524805444758-089113d48a6d",
];

const img = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

const VIDEO =
  "https://videos.pexels.com/video-files/4990236/4990236-uhd_1440_2560_25fps.mp4";

interface Seed {
  slug: string;
  title: string;
  brandSlug: string;
  category: CategorySlug;
  price: number;
  mrp: number;
  photo: string;
  description: string;
  rating: number;
  reviewCount: number;
  stock: number;
  isPreorder?: boolean;
  dropDate?: string;
  isFeatured?: boolean;
  hasVideo?: boolean;
  tags?: string[];
}

function build(seed: Seed): Product {
  const photoB = PHOTOS[(PHOTOS.indexOf(seed.photo) + 4) % PHOTOS.length]!;
  const photoC = PHOTOS[(PHOTOS.indexOf(seed.photo) + 8) % PHOTOS.length]!;
  return {
    id: `pr-${seed.slug}`,
    slug: seed.slug,
    title: seed.title,
    description: seed.description,
    brandSlug: seed.brandSlug,
    categorySlug: seed.category,
    price: seed.price,
    mrp: seed.mrp,
    images: [
      { url: img(seed.photo, 1200), alt: `${seed.title} — front view` },
      { url: img(photoB, 1200), alt: `${seed.title} — dial detail` },
      { url: img(photoC, 1200), alt: `${seed.title} — strap detail` },
    ],
    videoUrl: seed.hasVideo ? VIDEO : undefined,
    videoPoster: seed.hasVideo ? img(seed.photo, 800) : undefined,
    rating: seed.rating,
    reviewCount: seed.reviewCount,
    stock: seed.stock,
    isPreorder: seed.isPreorder ?? false,
    dropDate: seed.dropDate,
    isFeatured: seed.isFeatured ?? false,
    tags: seed.tags ?? [],
  };
}

const seeds: Seed[] = [
  // ── Casio ──
  {
    slug: "casio-vintage-a168",
    title: "Casio Vintage A168 Steel",
    brandSlug: "casio",
    category: "mens-watches",
    price: 4295,
    mrp: 5495,
    photo: "1523275335684-37898b6baf30",
    description:
      "The icon that never left. Brushed steel case, digital display, daily alarm and stopwatch — retro on the surface, indestructible underneath.",
    rating: 4.7,
    reviewCount: 312,
    stock: 24,
    isFeatured: true,
    hasVideo: true,
    tags: ["digital", "retro", "bestseller"],
  },
  {
    slug: "casio-g-shock-ga2100",
    title: "Casio G-Shock GA-2100 'CasiOak'",
    brandSlug: "casio",
    category: "mens-watches",
    price: 9995,
    mrp: 12995,
    photo: "1508057198894-247b23fe5ade",
    description:
      "Carbon Core Guard, 200m water resistance and the octagonal bezel that started a cult. Shock-resistant for every day you put it through.",
    rating: 4.9,
    reviewCount: 540,
    stock: 12,
    isFeatured: true,
    tags: ["g-shock", "sport"],
  },
  {
    slug: "casio-enticer-rose",
    title: "Casio Enticer Rose Dial",
    brandSlug: "casio",
    category: "womens-watches",
    price: 5495,
    mrp: 6995,
    photo: "1612817159949-195b6eb9e31a",
    description:
      "A slim analog dress watch with a sunburst dial and slim Roman markers. Quietly elegant for work and beyond.",
    rating: 4.5,
    reviewCount: 96,
    stock: 18,
    tags: ["analog", "dress"],
  },

  // ── Timex ──
  {
    slug: "timex-weekender-38",
    title: "Timex Weekender 38mm",
    brandSlug: "timex",
    category: "mens-watches",
    price: 6295,
    mrp: 7995,
    photo: "1524805444758-089113d48a6d",
    description:
      "The do-anything field watch with INDIGLO backlight and swap-anytime fabric strap. American honesty at an honest price.",
    rating: 4.6,
    reviewCount: 142,
    stock: 30,
    isFeatured: true,
    tags: ["field", "casual"],
  },
  {
    slug: "timex-marlin-automatic",
    title: "Timex Marlin Automatic",
    brandSlug: "timex",
    category: "mens-watches",
    price: 18995,
    mrp: 22995,
    photo: "1587836374828-4dbafa94cf0e",
    description:
      "A faithful 1960s reissue with a self-winding movement and domed crystal. Dress-watch heritage you can actually afford.",
    rating: 4.8,
    reviewCount: 73,
    stock: 6,
    tags: ["automatic", "dress", "heritage"],
  },
  {
    slug: "timex-ironman-classic",
    title: "Timex Ironman Classic 30",
    brandSlug: "timex",
    category: "mens-watches",
    price: 4995,
    mrp: 6495,
    photo: "1542496658-e33a6d0d50f6",
    description:
      "100-lap memory, 30m water resistance and INDIGLO. The training partner that has outlasted every fitness fad.",
    rating: 4.4,
    reviewCount: 58,
    stock: 22,
    tags: ["digital", "sport"],
  },

  // ── Armani Exchange ──
  {
    slug: "ax-banks-chronograph",
    title: "AX Banks Chronograph Steel",
    brandSlug: "armani-exchange",
    category: "mens-watches",
    price: 13995,
    mrp: 17995,
    photo: "1547996160-81dfa63595aa",
    description:
      "A bold 45mm chronograph in brushed steel with a slate dial. Milan attitude, weekend-to-boardroom versatile.",
    rating: 4.5,
    reviewCount: 84,
    stock: 14,
    isFeatured: true,
    hasVideo: true,
    tags: ["chronograph", "steel"],
  },
  {
    slug: "ax-lady-banks-mesh",
    title: "AX Lady Banks Rose Mesh",
    brandSlug: "armani-exchange",
    category: "womens-watches",
    price: 12995,
    mrp: 15995,
    photo: "1526045431048-f857369baa09",
    description:
      "Rose-gold mesh bracelet and a pavé-accent dial. The finishing line of an evening look.",
    rating: 4.6,
    reviewCount: 51,
    stock: 9,
    tags: ["mesh", "rose-gold"],
  },

  // ── Titan ──
  {
    slug: "titan-edge-ceramic",
    title: "Titan Edge Ceramic Ultra-Slim",
    brandSlug: "titan",
    category: "mens-watches",
    price: 16995,
    mrp: 19995,
    photo: "1434056886845-dac89ffe9b56",
    description:
      "Among the slimmest watches made in India — a 3.5mm profile in ceramic and steel. Disappears under a cuff, impossible to ignore.",
    rating: 4.8,
    reviewCount: 210,
    stock: 16,
    isFeatured: true,
    tags: ["slim", "dress", "ceramic"],
  },
  {
    slug: "titan-neo-blue",
    title: "Titan Neo Splash Blue Dial",
    brandSlug: "titan",
    category: "mens-watches",
    price: 5995,
    mrp: 7495,
    photo: "1523275335684-37898b6baf30",
    description:
      "A crisp blue sunburst dial on a steel bracelet. The dependable daily-wear that punches well above its price.",
    rating: 4.5,
    reviewCount: 134,
    stock: 28,
    tags: ["analog", "everyday"],
  },
  {
    slug: "titan-workwear-tan",
    title: "Titan Workwear Tan Leather",
    brandSlug: "titan",
    category: "womens-watches",
    price: 6495,
    mrp: 7995,
    photo: "1539874754764-5a96559165b0",
    description:
      "A warm tan leather strap and minimalist dial designed for the working week. Understated, never boring.",
    rating: 4.4,
    reviewCount: 67,
    stock: 20,
    tags: ["leather", "minimal"],
  },

  // ── Fastrack ──
  {
    slug: "fastrack-reflex-vox",
    title: "Fastrack Reflex Vox Smartwatch",
    brandSlug: "fastrack",
    category: "mens-watches",
    price: 3499,
    mrp: 4995,
    photo: "1508057198894-247b23fe5ade",
    description:
      "1.8\" display, Bluetooth calling and a week of battery. Bold, affordable, made to move on.",
    rating: 4.2,
    reviewCount: 421,
    stock: 40,
    isFeatured: true,
    hasVideo: true,
    tags: ["smartwatch", "bestseller"],
  },
  {
    slug: "fastrack-revoltt-fs1",
    title: "Fastrack Revoltt FS1 Green",
    brandSlug: "fastrack",
    category: "mens-watches",
    price: 2295,
    mrp: 2995,
    photo: "1542496658-e33a6d0d50f6",
    description:
      "Military-green silicone, oversized dial, loud and proud. Built for the restless.",
    rating: 4.1,
    reviewCount: 188,
    stock: 35,
    tags: ["analog", "casual"],
  },
  {
    slug: "fastrack-ruffles-purple",
    title: "Fastrack Ruffles Purple Dial",
    brandSlug: "fastrack",
    category: "womens-watches",
    price: 2495,
    mrp: 3295,
    photo: "1518131672697-613becd4fab5",
    description:
      "Playful purple dial and a slim mesh strap. Easy colour for everyday college-to-cafe wear.",
    rating: 4.3,
    reviewCount: 142,
    stock: 26,
    tags: ["mesh", "colour"],
  },

  // ── Sonata ──
  {
    slug: "sonata-rpm-black",
    title: "Sonata RPM Black Sport",
    brandSlug: "sonata",
    category: "mens-watches",
    price: 1495,
    mrp: 1995,
    photo: "1495856458515-0637185db551",
    description:
      "An honest analog-sport workhorse with a luminous dial and silicone strap. Value that just works.",
    rating: 4.0,
    reviewCount: 233,
    stock: 50,
    tags: ["sport", "value"],
  },
  {
    slug: "sonata-silverlining",
    title: "Sonata Silverlining Steel",
    brandSlug: "sonata",
    category: "womens-watches",
    price: 1795,
    mrp: 2395,
    photo: "1535632066927-ab7c9ab60908",
    description:
      "A petite silver bracelet watch with a mother-of-pearl dial. Quiet sparkle for everyday.",
    rating: 4.2,
    reviewCount: 119,
    stock: 33,
    isFeatured: true,
    tags: ["steel", "dress"],
  },

  // ── Fossil ──
  {
    slug: "fossil-machine-chrono",
    title: "Fossil Machine Chronograph",
    brandSlug: "fossil",
    category: "mens-watches",
    price: 12495,
    mrp: 15995,
    photo: "1533139502658-0198f920d8e8",
    description:
      "Gunmetal case, smoke dial and industrial chronograph dials. Vintage American design with a modern soul.",
    rating: 4.6,
    reviewCount: 176,
    stock: 15,
    isFeatured: true,
    hasVideo: true,
    tags: ["chronograph", "steel"],
  },
  {
    slug: "fossil-carlie-rose",
    title: "Fossil Carlie Rose-Gold Mesh",
    brandSlug: "fossil",
    category: "womens-watches",
    price: 11995,
    mrp: 14495,
    photo: "1526045431048-f857369baa09",
    description:
      "A 35mm rose-gold case on a fine mesh band with crystal markers. Romantic without trying.",
    rating: 4.7,
    reviewCount: 92,
    stock: 11,
    tags: ["mesh", "rose-gold"],
  },
  {
    slug: "fossil-fb-01-preorder",
    title: "Fossil FB-01 Dive-Inspired",
    brandSlug: "fossil",
    category: "mens-watches",
    price: 13995,
    mrp: 16995,
    photo: "1542496658-e33a6d0d50f6",
    description:
      "A dive-inspired three-hander with a rotating bezel and 100m water resistance. This batch drops soon — reserve yours.",
    rating: 4.5,
    reviewCount: 38,
    stock: 0,
    isPreorder: true,
    dropDate: "2026-07-12",
    tags: ["diver", "preorder"],
  },

  // ── Diesel ──
  {
    slug: "diesel-mega-chief",
    title: "Diesel Mega Chief 51mm",
    brandSlug: "diesel",
    category: "mens-watches",
    price: 17995,
    mrp: 21995,
    photo: "1542496658-e33a6d0d50f6",
    description:
      "Unapologetically oversized at 51mm with a blacked-out chronograph dial. A statement, not a suggestion.",
    rating: 4.5,
    reviewCount: 128,
    stock: 9,
    isFeatured: true,
    tags: ["chronograph", "oversized"],
  },
  {
    slug: "diesel-baby-chief-preorder",
    title: "Diesel Baby Chief Gold Drop",
    brandSlug: "diesel",
    category: "mens-watches",
    price: 19995,
    mrp: 24995,
    photo: "1547996160-81dfa63595aa",
    description:
      "Gold-tone steel and a textured dial in the next limited batch. Pre-order to lock the drop price.",
    rating: 4.6,
    reviewCount: 22,
    stock: 0,
    isPreorder: true,
    dropDate: "2026-07-05",
    tags: ["preorder", "gold"],
  },

  // ── Michael Kors ──
  {
    slug: "mk-lexington-gold",
    title: "Michael Kors Lexington Gold",
    brandSlug: "michael-kors",
    category: "womens-watches",
    price: 21995,
    mrp: 26995,
    photo: "1526045431048-f857369baa09",
    description:
      "A glamorous gold-tone chronograph with a pavé bezel. Jet-set sparkle for the wrist that wants to be seen.",
    rating: 4.7,
    reviewCount: 164,
    stock: 10,
    isFeatured: true,
    hasVideo: true,
    tags: ["chronograph", "gold", "glam"],
  },
  {
    slug: "mk-pyper-rose",
    title: "Michael Kors Pyper Rose Pavé",
    brandSlug: "michael-kors",
    category: "womens-watches",
    price: 18995,
    mrp: 22995,
    photo: "1612817159949-195b6eb9e31a",
    description:
      "Rose-gold case ringed with crystals on a logo bracelet. Effortless luxe, everyday wearable.",
    rating: 4.6,
    reviewCount: 88,
    stock: 13,
    tags: ["rose-gold", "glam"],
  },

  // ── Guess ──
  {
    slug: "guess-frontier-crystal",
    title: "Guess Frontier Crystal Bezel",
    brandSlug: "guess",
    category: "womens-watches",
    price: 13995,
    mrp: 17995,
    photo: "1518131672697-613becd4fab5",
    description:
      "A full crystal-set bezel and silver sunray dial. Maximum sparkle, signature Guess swagger.",
    rating: 4.4,
    reviewCount: 76,
    stock: 17,
    isFeatured: true,
    tags: ["crystal", "glam"],
  },
  {
    slug: "guess-legacy-black",
    title: "Guess Legacy Black & Gold",
    brandSlug: "guess",
    category: "mens-watches",
    price: 14995,
    mrp: 18995,
    photo: "1547996160-81dfa63595aa",
    description:
      "Black dial, gold-tone accents and a multifunction layout. Statement dial energy for him.",
    rating: 4.3,
    reviewCount: 54,
    stock: 12,
    tags: ["multifunction", "gold"],
  },

  // ── Lacoste ──
  {
    slug: "lacoste-replay-blue",
    title: "Lacoste Replay Navy Silicone",
    brandSlug: "lacoste",
    category: "mens-watches",
    price: 10995,
    mrp: 13495,
    photo: "1508057198894-247b23fe5ade",
    description:
      "Court-ready sport in navy silicone with the signature croc. French ease, weekend energy.",
    rating: 4.4,
    reviewCount: 61,
    stock: 19,
    isFeatured: true,
    hasVideo: true,
    tags: ["sport", "silicone"],
  },
  {
    slug: "lacoste-suzanne-mesh",
    title: "Lacoste Suzanne Mesh",
    brandSlug: "lacoste",
    category: "womens-watches",
    price: 11495,
    mrp: 13995,
    photo: "1612817159949-195b6eb9e31a",
    description:
      "A clean two-hand dial on a soft rose mesh band. Minimal sportswear elegance.",
    rating: 4.5,
    reviewCount: 43,
    stock: 14,
    tags: ["mesh", "minimal"],
  },

  // ── French Connection ──
  {
    slug: "fcuk-minimal-white",
    title: "French Connection Minimal White",
    brandSlug: "french-connection",
    category: "womens-watches",
    price: 5995,
    mrp: 7995,
    photo: "1539874754764-5a96559165b0",
    description:
      "Pared-back white dial and slim leather strap. London cool, nothing wasted.",
    rating: 4.3,
    reviewCount: 39,
    stock: 21,
    isFeatured: true,
    tags: ["minimal", "leather"],
  },
  {
    slug: "fcuk-mono-steel",
    title: "French Connection Mono Steel",
    brandSlug: "french-connection",
    category: "mens-watches",
    price: 6495,
    mrp: 8495,
    photo: "1434056886845-dac89ffe9b56",
    description:
      "A monochrome steel-bracelet watch with a sharp dial. Minimal that still makes a point.",
    rating: 4.2,
    reviewCount: 31,
    stock: 18,
    tags: ["minimal", "steel"],
  },

  // ── Carter London ──
  {
    slug: "carter-edition-rosewood",
    title: "Carter London Edition Rosewood",
    brandSlug: "carter-london",
    category: "mens-watches",
    price: 7995,
    mrp: 10995,
    photo: "1614164185128-e4ec99c436d7",
    description:
      "A British dress watch with a sunburst dial and tan leather. Affordable formality done right.",
    rating: 4.4,
    reviewCount: 47,
    stock: 16,
    isFeatured: true,
    tags: ["dress", "leather"],
  },
  {
    slug: "carter-aviator-green",
    title: "Carter London Aviator Green",
    brandSlug: "carter-london",
    category: "mens-watches",
    price: 8495,
    mrp: 11495,
    photo: "1587836374828-4dbafa94cf0e",
    description:
      "Pilot-inspired numerals and a forest-green dial on steel. Heritage cues, modern price.",
    rating: 4.3,
    reviewCount: 29,
    stock: 13,
    tags: ["pilot", "dress"],
  },

  // ── Titan Raga ──
  {
    slug: "titan-raga-viva",
    title: "Titan Raga Viva Gold",
    brandSlug: "titan-raga",
    category: "womens-watches",
    price: 9995,
    mrp: 12995,
    photo: "1535632066927-ab7c9ab60908",
    description:
      "Jewellery for the wrist — a gold-tone bracelet watch with a crystal-studded dial. Made to be noticed.",
    rating: 4.7,
    reviewCount: 158,
    stock: 15,
    isFeatured: true,
    hasVideo: true,
    tags: ["jewellery", "gold", "glam"],
  },
  {
    slug: "titan-raga-pearl-preorder",
    title: "Titan Raga Pearl Mother-of-Pearl",
    brandSlug: "titan-raga",
    category: "womens-watches",
    price: 11995,
    mrp: 14995,
    photo: "1612817159949-195b6eb9e31a",
    description:
      "A mother-of-pearl dial framed in rose-gold, dropping in the next batch. Reserve before it sells out.",
    rating: 4.8,
    reviewCount: 34,
    stock: 0,
    isPreorder: true,
    dropDate: "2026-06-30",
    tags: ["preorder", "jewellery", "rose-gold"],
  },
  {
    slug: "titan-raga-masaba",
    title: "Titan Raga × Masaba Floral",
    brandSlug: "titan-raga",
    category: "womens-watches",
    price: 12995,
    mrp: 15995,
    photo: "1518131672697-613becd4fab5",
    description:
      "A designer collaboration dial with floral motifs and a slim bracelet. Art you wear.",
    rating: 4.6,
    reviewCount: 41,
    stock: 8,
    tags: ["designer", "jewellery"],
  },
];

export const products: Product[] = seeds.map(build);

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByBrand(brandSlug: string): Product[] {
  return products.filter((p) => p.brandSlug === brandSlug);
}

export function getProductsByCategory(category: CategorySlug): Product[] {
  return products.filter((p) => p.categorySlug === category);
}

export const featuredProducts = products.filter((p) => p.isFeatured);
export const preorderProducts = products.filter((p) => p.isPreorder);
export const videoProducts = products.filter((p) => Boolean(p.videoUrl));

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter((p) => p.brandSlug === product.brandSlug && p.id !== product.id)
    .slice(0, limit);
}

export function searchProducts(query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return products.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.brandSlug.replace(/-/g, " ").includes(q) ||
      p.tags.some((t) => t.includes(q)),
  );
}
