/**
 * Domain types for Horology365.
 * These mirror the Phase 2 Supabase schema so the mock-data layer
 * can be swapped for real queries without touching components.
 */

export type CategorySlug = "mens-watches" | "womens-watches";

export interface Brand {
  id: string;
  slug: string;
  name: string;
  /** Short tagline shown in brand bays / collection header. */
  tagline: string;
  logoUrl: string;
  /** Wide hero image for the brand collection page. */
  coverUrl: string;
  isActive: boolean;
  /** Controls brand-bay ordering on the homepage. */
  sortOrder: number;
}

export interface Category {
  id: string;
  slug: CategorySlug;
  name: string;
  imageUrl: string;
  description: string;
}

export interface ProductImage {
  url: string;
  alt: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  brandSlug: string;
  /**
   * Display name override for the brand. Set for admin-added products whose
   * brand isn't in the seeded brand list yet; otherwise resolved from `brands`.
   */
  brandName?: string;
  categorySlug: CategorySlug;
  /** Selling price in INR (paise-free, whole rupees). */
  price: number;
  /** Manufacturer's listed price; used for strikethrough + % off. */
  mrp: number;
  images: ProductImage[];
  /** Optional muted autoplay loop for the video product wall. */
  videoUrl?: string;
  /** Poster shown before the video loads. */
  videoPoster?: string;
  rating: number;
  reviewCount: number;
  stock: number;
  isPreorder: boolean;
  /** Expected drop / dispatch date for pre-orders (ISO date). */
  dropDate?: string;
  isFeatured: boolean;
  tags: string[];
  /** Colourways the product ships in (admin-added products carry these). */
  variants?: Variant[];
}

export interface Banner {
  id: string;
  /** Small uppercase eyebrow (e.g. "This Week's Drop"). */
  eyebrow: string;
  headline: string;
  subhead: string;
  ctaLabel: string;
  ctaHref: string;
  /** Ambient background video (muted, looped) — free stock, hotlink-safe. */
  videoUrl: string;
  posterUrl: string;
  /** Featured watch shown on the slide card; resolved from the catalog. */
  productSlug: string;
  sortOrder: number;
}

export interface Offer {
  id: string;
  title: string;
  subtitle: string;
  productSlug: string;
  badge: string;
}

export interface Review {
  id: string;
  author: string;
  location: string;
  rating: number;
  body: string;
  productTitle: string;
  avatarUrl?: string;
}

export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  brandName: string;
  price: number;
  mrp: number;
  imageUrl: string;
  imageAlt: string;
  quantity: number;
  isPreorder: boolean;
}

export type PaymentMethod = "cod" | "upi";

export interface CheckoutDetails {
  name: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  paymentMethod: PaymentMethod;
  /** UPI transaction reference / UTR entered after paying (UPI orders). */
  upiReference?: string;
}

export type OrderStatus = "pending" | "paid" | "shipped" | "delivered";

export interface Order {
  id: string;
  items: CartItem[];
  details: CheckoutDetails;
  subtotal: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

// ─── Admin / inventory model (Brand → Model → Variant) ──────────
// Mirrors the Phase 2 Supabase schema: a Model is a product line; a Variant
// is the actual SKU you sell (a colourway / strap), each with its own
// availability — live stock or a pre-order batch.

export type VariantAvailability = "in_stock" | "preorder" | "in_delivery";

export interface Variant {
  id: string;
  /** Colourway / strap name, e.g. "Matte Black". */
  name: string;
  /** Swatch colour (hex) shown on the storefront selector. */
  colorHex: string;
  sku: string;
  availability: VariantAvailability;
  /** Units on hand (in_stock / in_delivery). */
  stockQty: number;
  /** Size of the pre-order batch we'll bring in. */
  preorderTarget: number;
  /** How many customers have reserved so far. */
  preorderReserved: number;
  /** Expected drop / dispatch date for pre-orders (ISO date). */
  dropDate?: string;
}

export interface AdminModel {
  id: string;
  brandSlug: string;
  /**
   * Storefront URL slug — unique across the seeded catalog and the admin
   * catalog. Generated when the model is published; older rows fall back to a
   * slug derived from the brand + title.
   */
  slug?: string;
  /** Brand display name — needed when the brand isn't in the seeded list. */
  brandName?: string;
  title: string;
  categorySlug: CategorySlug;
  description: string;
  price: number;
  mrp: number;
  /** Primary/cover image (first of the gallery). Kept for back-compat. */
  imageUrl: string;
  /** Full image gallery — paste official product photo links here. */
  images?: string[];
  variants: Variant[];
  createdAt: string;
  /**
   * Demo rows seeded into an empty admin catalog. They duplicate watches that
   * already exist in the storefront catalog, so they are never published to it.
   */
  isSample?: boolean;
}
