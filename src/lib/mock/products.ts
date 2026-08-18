import type { CategorySlug, Product } from "@/lib/types";
import { brands } from "./brands";

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
  "1523170335258-f5ed11844a49",
  "1622434641406-a158123450f9",
  "1542496658-e33a6d0d50f6",
  "1526045431048-f857369baa09",
  "1518131672697-613becd4fab5",
  "1612817159949-195b6eb9e31a",
  "1539874754764-5a96559165b0",
  "1614164185128-e4ec99c436d7",
  "1522312346375-d1a52e2b99b3",
  "1587836374828-4dbafa94cf0e",
  "1524805444758-089113d48a6d",
  "1620625515032-6ed0c1790c75",
  "1587925358603-c2eea5305bbc",
  "1582150264904-e0bea5ef0ad1",
  "1619946928632-abefa12506e2",
];

const img = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

/**
 * Real watch footage, self-hosted in /public/videos (Pexels CC0, compressed
 * to small web clips). Served same-origin so it always plays; each clip has a
 * matching poster frame in /public/posters as a crisp fallback.
 * Clip 6 is Diesel-branded footage — excluded while Diesel is off the roster.
 */
const VIDEO_CLIPS = [1, 2, 3, 4, 5, 7, 8];

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

let videoCursor = 0;

/**
 * Current headline deals. Casio (incl. G-Shock) runs 60% off; Fastrack and
 * Sonata run deep 50% deals. Applied at build time so every price, badge and
 * the hero reflect the same number.
 */
const DEAL_OFF: Record<string, number> = {
  casio: 0.6,
  fastrack: 0.5,
  sonata: 0.5,
};

function dealPrice(brandSlug: string, mrp: number, fallback: number): number {
  const off = DEAL_OFF[brandSlug];
  if (!off) return fallback;
  // Round to the nearest ₹5 for a clean price tag.
  return Math.round((mrp * (1 - off)) / 5) * 5;
}

function build(seed: Seed): Product {
  const photoB = PHOTOS[(PHOTOS.indexOf(seed.photo) + 4) % PHOTOS.length]!;
  const photoC = PHOTOS[(PHOTOS.indexOf(seed.photo) + 8) % PHOTOS.length]!;
  const clip = seed.hasVideo ? VIDEO_CLIPS[videoCursor++ % VIDEO_CLIPS.length]! : 0;
  const videoUrl = seed.hasVideo ? `/videos/watch-${clip}.mp4` : undefined;
  const price = dealPrice(seed.brandSlug, seed.mrp, seed.price);
  return {
    id: `pr-${seed.slug}`,
    slug: seed.slug,
    title: seed.title,
    description: seed.description,
    brandSlug: seed.brandSlug,
    categorySlug: seed.category,
    price,
    mrp: seed.mrp,
    images: [
      { url: img(seed.photo, 1200), alt: `${seed.title} — front view` },
      { url: img(photoB, 1200), alt: `${seed.title} — dial detail` },
      { url: img(photoC, 1200), alt: `${seed.title} — strap detail` },
    ],
    videoUrl,
    videoPoster: seed.hasVideo ? `/posters/watch-${clip}.jpg` : undefined,
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
    photo: "1582150264904-e0bea5ef0ad1",
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
    photo: "1523170335258-f5ed11844a49",
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
    photo: "1522312346375-d1a52e2b99b3",
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
    photo: "1622434641406-a158123450f9",
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
    photo: "1587925358603-c2eea5305bbc",
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
    photo: "1522312346375-d1a52e2b99b3",
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

  // ── More Casio ──
  { slug: "casio-mtp-1303", title: "Casio Enticer MTP-1303 Steel", brandSlug: "casio", category: "mens-watches", price: 3995, mrp: 4995, photo: "1524592094714-0f0654e20314", description: "A clean three-hand dress watch on a steel bracelet with a date window. Everyday smart, easy on the wallet.", rating: 4.4, reviewCount: 187, stock: 32, hasVideo: true, tags: ["analog", "dress"] },
  { slug: "casio-edifice-efr", title: "Casio Edifice EFR-526 Chronograph", brandSlug: "casio", category: "mens-watches", price: 8995, mrp: 11495, photo: "1547996160-81dfa63595aa", description: "A motorsport-inspired chronograph with a tachymeter bezel and bold dial. Built for the fast lane.", rating: 4.6, reviewCount: 121, stock: 17, isFeatured: true, tags: ["chronograph", "sport"] },
  { slug: "casio-baby-g-pink", title: "Casio Baby-G BA-110 Pink", brandSlug: "casio", category: "womens-watches", price: 6995, mrp: 8495, photo: "1522312346375-d1a52e2b99b3", description: "Shock-resistant, sporty and unmistakably fun in blush pink. Tough never looked this cute.", rating: 4.5, reviewCount: 143, stock: 21, tags: ["sport", "digital"] },

  // ── More Timex ──
  { slug: "timex-expedition-scout", title: "Timex Expedition Scout 40mm", brandSlug: "timex", category: "mens-watches", price: 7495, mrp: 9495, photo: "1542496658-e33a6d0d50f6", description: "A rugged outdoor field watch with INDIGLO and a leather strap. Trail-ready, city-smart.", rating: 4.6, reviewCount: 98, stock: 24, isFeatured: true, hasVideo: true, tags: ["field", "outdoor"] },
  { slug: "timex-fairfield-chrono", title: "Timex Fairfield Chronograph", brandSlug: "timex", category: "mens-watches", price: 8995, mrp: 10995, photo: "1587836374828-4dbafa94cf0e", description: "A minimalist chronograph with a cream dial and slim case. Timeless, understated, versatile.", rating: 4.5, reviewCount: 64, stock: 15, tags: ["chronograph", "minimal"] },
  { slug: "timex-easy-reader", title: "Timex Easy Reader 38mm", brandSlug: "timex", category: "womens-watches", price: 5495, mrp: 6995, photo: "1539874754764-5a96559165b0", description: "Big, clear numerals on a soft leather strap. The fuss-free classic that just works.", rating: 4.4, reviewCount: 77, stock: 28, tags: ["analog", "classic"] },

  // ── More Armani Exchange ──
  { slug: "ax-hampton-leather", title: "AX Hampton Brown Leather", brandSlug: "armani-exchange", category: "mens-watches", price: 11995, mrp: 14995, photo: "1614164185128-e4ec99c436d7", description: "A refined dress watch with a navy dial and tan leather. Milan polish for the everyday.", rating: 4.5, reviewCount: 58, stock: 16, isFeatured: true, tags: ["dress", "leather"] },
  { slug: "ax-drexler-blue", title: "AX Drexler Blue Steel", brandSlug: "armani-exchange", category: "mens-watches", price: 13495, mrp: 16995, photo: "1434056886845-dac89ffe9b56", description: "A bold blue chronograph on a brushed-steel bracelet. Weekend-to-boardroom confidence.", rating: 4.4, reviewCount: 44, stock: 12, hasVideo: true, tags: ["chronograph", "steel"] },
  { slug: "ax-lady-mesh-silver", title: "AX Lady Silver Mesh", brandSlug: "armani-exchange", category: "womens-watches", price: 11495, mrp: 13995, photo: "1518131672697-613becd4fab5", description: "A slim silver mesh band with a crisp white dial. Effortless office-to-evening.", rating: 4.5, reviewCount: 37, stock: 14, tags: ["mesh", "minimal"] },

  // ── More Titan ──
  { slug: "titan-nebula-gold", title: "Titan Nebula 18kt Gold", brandSlug: "titan", category: "mens-watches", price: 38995, mrp: 44995, photo: "1547996160-81dfa63595aa", description: "Solid 18kt gold case and a mother-of-pearl dial. A genuine heirloom-grade dress watch.", rating: 4.9, reviewCount: 52, stock: 5, isFeatured: true, tags: ["gold", "luxury", "dress"] },
  { slug: "titan-karishma-classic", title: "Titan Karishma Classic", brandSlug: "titan", category: "mens-watches", price: 3495, mrp: 4495, photo: "1524592094714-0f0654e20314", description: "The dependable everyday companion — slim case, gold-tone accents, all-day comfort.", rating: 4.3, reviewCount: 219, stock: 40, tags: ["analog", "everyday"] },
  { slug: "titan-octane-chrono", title: "Titan Octane Sport Chronograph", brandSlug: "titan", category: "mens-watches", price: 9995, mrp: 12495, photo: "1508057198894-247b23fe5ade", description: "A sporty chronograph with a textured dial and silicone strap. Built to keep pace.", rating: 4.5, reviewCount: 86, stock: 19, hasVideo: true, tags: ["chronograph", "sport"] },

  // ── More Fastrack ──
  { slug: "fastrack-tickergh", title: "Fastrack FS1 Pro Smartwatch", brandSlug: "fastrack", category: "mens-watches", price: 3999, mrp: 5995, photo: "1508057198894-247b23fe5ade", description: "AMOLED display, 100+ sports modes and Bluetooth calling. Bold features, bolder price.", rating: 4.2, reviewCount: 356, stock: 45, isFeatured: true, tags: ["smartwatch", "bestseller"] },
  { slug: "fastrack-denim-blue", title: "Fastrack Denim Blue Dial", brandSlug: "fastrack", category: "mens-watches", price: 2695, mrp: 3495, photo: "1542496658-e33a6d0d50f6", description: "A washed-denim dial and tan strap with casual everyday energy. Easy, affordable, cool.", rating: 4.1, reviewCount: 132, stock: 30, tags: ["analog", "casual"] },
  { slug: "fastrack-reflex-play", title: "Fastrack Reflex Play Coral", brandSlug: "fastrack", category: "womens-watches", price: 2999, mrp: 3995, photo: "1518131672697-613becd4fab5", description: "A lightweight smartwatch in coral with health tracking and swappable straps. Move on.", rating: 4.2, reviewCount: 174, stock: 27, tags: ["smartwatch", "colour"] },

  // ── More Sonata ──
  { slug: "sonata-volt-led", title: "Sonata Volt+ LED Digital", brandSlug: "sonata", category: "mens-watches", price: 1295, mrp: 1695, photo: "1523170335258-f5ed11844a49", description: "A bright LED digital with day, date and alarm. Honest value that lasts.", rating: 4.0, reviewCount: 198, stock: 52, tags: ["digital", "value"] },
  { slug: "sonata-poolside-women", title: "Sonata Poolside Rose", brandSlug: "sonata", category: "womens-watches", price: 1595, mrp: 2095, photo: "1612817159949-195b6eb9e31a", description: "A cheerful rose dial on a slim bracelet. Light, pretty, perfect for daily wear.", rating: 4.2, reviewCount: 96, stock: 36, tags: ["analog", "everyday"] },
  { slug: "sonata-classic-leather", title: "Sonata Classic Brown Leather", brandSlug: "sonata", category: "mens-watches", price: 1695, mrp: 2195, photo: "1614164185128-e4ec99c436d7", description: "A simple white dial on a brown leather strap. The no-nonsense daily workhorse.", rating: 4.1, reviewCount: 121, stock: 44, tags: ["leather", "classic"] },

  // ── More Fossil ──
  { slug: "fossil-grant-brown", title: "Fossil Grant Brown Leather Chrono", brandSlug: "fossil", category: "mens-watches", price: 11995, mrp: 14995, photo: "1614164185128-e4ec99c436d7", description: "Roman numerals, exposed sub-dials and rich brown leather. Vintage charm, modern build.", rating: 4.7, reviewCount: 142, stock: 14, isFeatured: true, hasVideo: true, tags: ["chronograph", "leather"] },
  { slug: "fossil-jacqueline-rose", title: "Fossil Jacqueline Rose Leather", brandSlug: "fossil", category: "womens-watches", price: 9995, mrp: 12495, photo: "1539874754764-5a96559165b0", description: "A slim rose-gold case with a moonphase-style sub-dial on blush leather. Quietly romantic.", rating: 4.6, reviewCount: 73, stock: 18, tags: ["leather", "rose-gold"] },
  { slug: "fossil-townsman-auto", title: "Fossil Townsman Automatic Skeleton", brandSlug: "fossil", category: "mens-watches", price: 16995, mrp: 20995, photo: "1587836374828-4dbafa94cf0e", description: "A see-through automatic movement and a domed crystal. Mechanical soul at a fair price.", rating: 4.7, reviewCount: 61, stock: 0, isPreorder: true, dropDate: "2026-07-08", tags: ["automatic", "skeleton", "preorder"] },

  // ── More Diesel ──
  { slug: "diesel-overflow-black", title: "Diesel Overflow All-Black", brandSlug: "diesel", category: "mens-watches", price: 16995, mrp: 20995, photo: "1542496658-e33a6d0d50f6", description: "Blacked-out, oversized and unapologetic. A statement that needs no introduction.", rating: 4.4, reviewCount: 88, stock: 11, isFeatured: true, tags: ["oversized", "black"] },
  { slug: "diesel-spiked-gold", title: "Diesel Spiked Gold-Tone", brandSlug: "diesel", category: "mens-watches", price: 18995, mrp: 22995, photo: "1547996160-81dfa63595aa", description: "Gold-tone steel with a spiked bezel and textured dial. Maximalist, fearless, loud.", rating: 4.3, reviewCount: 54, stock: 8, hasVideo: true, tags: ["gold", "statement"] },
  { slug: "diesel-flayed-chrono", title: "Diesel Flayed Chronograph", brandSlug: "diesel", category: "mens-watches", price: 19995, mrp: 24995, photo: "1622434641406-a158123450f9", description: "An industrial chronograph with an exposed dial and chunky case. Built like a tool.", rating: 4.4, reviewCount: 47, stock: 10, tags: ["chronograph", "oversized"] },

  // ── More Michael Kors ──
  { slug: "mk-runway-silver", title: "Michael Kors Runway Silver", brandSlug: "michael-kors", category: "womens-watches", price: 19995, mrp: 24995, photo: "1518131672697-613becd4fab5", description: "A sleek silver-tone bracelet with an oversized dial. Minimal glamour with maximum presence.", rating: 4.6, reviewCount: 108, stock: 12, isFeatured: true, hasVideo: true, tags: ["steel", "glam"] },
  { slug: "mk-parker-pave", title: "Michael Kors Parker Pavé Gold", brandSlug: "michael-kors", category: "womens-watches", price: 22995, mrp: 27995, photo: "1526045431048-f857369baa09", description: "Three sub-dials ringed with crystals on a gold-tone bracelet. Full-glam statement piece.", rating: 4.7, reviewCount: 96, stock: 9, tags: ["chronograph", "gold", "glam"] },
  { slug: "mk-bradshaw-gold", title: "Michael Kors Bradshaw Gold", brandSlug: "michael-kors", category: "womens-watches", price: 23995, mrp: 28995, photo: "1612817159949-195b6eb9e31a", description: "A bold oversized chronograph in polished gold-tone. The jet-set classic.", rating: 4.7, reviewCount: 134, stock: 0, isPreorder: true, dropDate: "2026-07-15", tags: ["chronograph", "gold", "preorder"] },

  // ── More Guess ──
  { slug: "guess-letterm-gold", title: "Guess Letter M Gold Logo", brandSlug: "guess", category: "womens-watches", price: 12995, mrp: 16495, photo: "1612817159949-195b6eb9e31a", description: "A gold-tone logo-dial bracelet watch with signature swagger. Made to be noticed.", rating: 4.4, reviewCount: 67, stock: 15, isFeatured: true, tags: ["gold", "logo"] },
  { slug: "guess-moonlight-silver", title: "Guess Moonlight Silver Crystal", brandSlug: "guess", category: "womens-watches", price: 13495, mrp: 16995, photo: "1518131672697-613becd4fab5", description: "A crystal-pavé dial on a silver bracelet. Sparkle that follows you into the night.", rating: 4.5, reviewCount: 58, stock: 13, hasVideo: true, tags: ["crystal", "glam"] },
  { slug: "guess-king-black", title: "Guess King Black & Steel", brandSlug: "guess", category: "mens-watches", price: 15995, mrp: 19995, photo: "1547996160-81dfa63595aa", description: "A bold multifunction dial in black and steel. Confident, contemporary, unmistakably Guess.", rating: 4.3, reviewCount: 41, stock: 11, tags: ["multifunction", "steel"] },

  // ── More Lacoste ──
  { slug: "lacoste-tiebreaker", title: "Lacoste Tiebreaker Steel", brandSlug: "lacoste", category: "mens-watches", price: 12495, mrp: 15495, photo: "1434056886845-dac89ffe9b56", description: "A clean steel-bracelet sport watch with the signature croc. Court-ready, city-cool.", rating: 4.5, reviewCount: 49, stock: 17, isFeatured: true, tags: ["sport", "steel"] },
  { slug: "lacoste-12-12-white", title: "Lacoste 12.12 White Silicone", brandSlug: "lacoste", category: "mens-watches", price: 9995, mrp: 12495, photo: "1508057198894-247b23fe5ade", description: "An iconic polo-inspired dial on a fresh white strap. Sporty French minimalism.", rating: 4.4, reviewCount: 62, stock: 22, hasVideo: true, tags: ["silicone", "sport"] },
  { slug: "lacoste-club-brown", title: "Lacoste Club Brown Leather", brandSlug: "lacoste", category: "mens-watches", price: 10995, mrp: 13495, photo: "1614164185128-e4ec99c436d7", description: "A relaxed everyday watch with a navy dial and brown leather. Easy weekend energy.", rating: 4.4, reviewCount: 38, stock: 18, tags: ["leather", "casual"] },

  // ── More French Connection ──
  { slug: "fcuk-noir-chrono", title: "French Connection Noir Chronograph", brandSlug: "french-connection", category: "mens-watches", price: 7495, mrp: 9495, photo: "1622434641406-a158123450f9", description: "A blacked-out minimalist chronograph on a mesh band. London cool, dialled up.", rating: 4.3, reviewCount: 34, stock: 16, isFeatured: true, tags: ["chronograph", "minimal"] },
  { slug: "fcuk-rose-mesh", title: "French Connection Rose Mesh", brandSlug: "french-connection", category: "womens-watches", price: 6495, mrp: 8495, photo: "1612817159949-195b6eb9e31a", description: "A rose-gold mesh band and slim case. Pared-back elegance for every day.", rating: 4.3, reviewCount: 41, stock: 19, tags: ["mesh", "rose-gold"] },
  { slug: "fcuk-cream-leather", title: "French Connection Cream Leather", brandSlug: "french-connection", category: "womens-watches", price: 5995, mrp: 7995, photo: "1539874754764-5a96559165b0", description: "A clean cream dial on a soft leather strap. Understated London minimalism.", rating: 4.2, reviewCount: 27, stock: 23, tags: ["leather", "minimal"] },

  // ── More Carter London ──
  { slug: "carter-classic-blue", title: "Carter London Classic Blue", brandSlug: "carter-london", category: "mens-watches", price: 6995, mrp: 9995, photo: "1614164185128-e4ec99c436d7", description: "A sunburst blue dial on a leather strap. Affordable British formality, beautifully done.", rating: 4.4, reviewCount: 36, stock: 18, isFeatured: true, tags: ["dress", "leather"] },
  { slug: "carter-skeleton-auto", title: "Carter London Skeleton Automatic", brandSlug: "carter-london", category: "mens-watches", price: 9995, mrp: 13995, photo: "1587836374828-4dbafa94cf0e", description: "An open-heart automatic with an exposed balance wheel. Mechanical character on a budget.", rating: 4.5, reviewCount: 28, stock: 0, isPreorder: true, dropDate: "2026-07-02", hasVideo: true, tags: ["automatic", "skeleton", "preorder"] },
  { slug: "carter-chrono-steel", title: "Carter London Chrono Steel", brandSlug: "carter-london", category: "mens-watches", price: 8995, mrp: 11995, photo: "1434056886845-dac89ffe9b56", description: "A crisp multi-dial chronograph on a steel bracelet. Dress-watch poise, everyday price.", rating: 4.3, reviewCount: 22, stock: 14, tags: ["chronograph", "steel"] },

  // ── More Titan Raga ──
  { slug: "titan-raga-aurora", title: "Titan Raga Aurora Crystal", brandSlug: "titan-raga", category: "womens-watches", price: 10995, mrp: 13495, photo: "1522312346375-d1a52e2b99b3", description: "A crystal-studded bezel and shimmering dial on a slim bracelet. Everyday sparkle.", rating: 4.6, reviewCount: 84, stock: 16, isFeatured: true, hasVideo: true, tags: ["crystal", "jewellery"] },
  { slug: "titan-raga-pretties", title: "Titan Raga Pretties Rose", brandSlug: "titan-raga", category: "womens-watches", price: 8995, mrp: 11495, photo: "1612817159949-195b6eb9e31a", description: "A delicate rose-gold case with a pearl dial. Feminine, refined, easy to love.", rating: 4.5, reviewCount: 67, stock: 20, tags: ["rose-gold", "jewellery"] },
  { slug: "titan-raga-power-pearl", title: "Titan Raga Power Pearl", brandSlug: "titan-raga", category: "womens-watches", price: 13995, mrp: 16995, photo: "1518131672697-613becd4fab5", description: "A bold mother-of-pearl dial framed in gold-tone steel. Boardroom-ready glamour.", rating: 4.7, reviewCount: 53, stock: 12, tags: ["jewellery", "gold"] },
];

/**
 * Only brands on the active roster are sold — delisting a brand in brands.ts
 * hides its watches across the whole storefront (grids, drops, search, sitemap).
 */
const activeBrandSlugs = new Set(
  brands.filter((b) => b.isActive).map((b) => b.slug),
);

export const products: Product[] = seeds
  .filter((seed) => activeBrandSlugs.has(seed.brandSlug))
  .map(build);

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

/** Top sellers by review volume — used for the homepage best-sellers grid. */
export const bestSellers = [...products]
  .filter((p) => !p.isPreorder)
  .sort((a, b) => b.reviewCount - a.reviewCount)
  .slice(0, 8);

/** Newest in (tail of the catalog) — fills the category/home grids. */
export const newArrivals = [...products].slice(-12).reverse();

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
