import { getBrandBySlug } from "@/lib/mock/brands";
import type { AdminModel, Product, ProductImage } from "@/lib/types";

/**
 * Bridge between the admin catalog (Brand → Model → Variant) and the
 * storefront catalog (flat `Product`). Everything here is pure so it can run
 * on the server, in the client bundle and in tests alike.
 *
 * In Phase 2 both sides read the same Supabase tables and this file collapses
 * into a single query/select — the shapes below are what that query returns.
 */

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=900&q=70";

/** URL-safe slug: "Casio G-Shock GA-2100" → "casio-g-shock-ga-2100". */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "michael-kors" → "Michael Kors" (used for brands added by the admin). */
export function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Append -2, -3, … until the slug is free. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = base || "product";
  if (!taken.has(root)) return root;
  let n = 2;
  while (taken.has(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}

/**
 * Slug root for a product: brand + model, unless the model name already leads
 * with the brand ("Titan Edge" under Titan stays `titan-edge`).
 */
export function productSlugRoot(brandName: string, title: string): string {
  const model = slugify(title);
  const brand = slugify(brandName);
  return model.startsWith(brand) ? model : slugify(`${brand} ${model}`);
}

/** Storefront slug for an admin model (back-compat for rows saved before slugs). */
export function adminModelSlug(model: AdminModel): string {
  return (
    model.slug || productSlugRoot(model.brandSlug, model.title) || model.id
  );
}

/** Brand label to show for a product, whatever catalog it came from. */
export function displayBrandName(product: Product): string {
  return (
    getBrandBySlug(product.brandSlug)?.name ??
    product.brandName ??
    titleFromSlug(product.brandSlug)
  );
}

export function adminBrandName(model: AdminModel): string {
  return (
    getBrandBySlug(model.brandSlug)?.name ??
    model.brandName ??
    titleFromSlug(model.brandSlug)
  );
}

/**
 * Project an admin model onto the storefront `Product` shape. Stock is the sum
 * of every non-pre-order variant; a model whose stock is gone but which still
 * has a pre-order batch open reads as a pre-order on the storefront.
 */
export function adminModelToProduct(model: AdminModel): Product {
  const gallery = (model.images?.length ? model.images : [model.imageUrl])
    .map((url) => url.trim())
    .filter(Boolean);
  const urls = gallery.length ? gallery : [FALLBACK_IMAGE];

  const images: ProductImage[] = urls.map((url, i) => ({
    url,
    alt: i === 0 ? `${model.title} — front view` : `${model.title} — view ${i + 1}`,
  }));

  const stock = model.variants
    .filter((v) => v.availability !== "preorder")
    .reduce((sum, v) => sum + Math.max(0, v.stockQty), 0);

  const preorderVariants = model.variants.filter(
    (v) => v.availability === "preorder",
  );
  const isPreorder = stock <= 0 && preorderVariants.length > 0;
  const dropDate = preorderVariants
    .map((v) => v.dropDate)
    .filter((d): d is string => Boolean(d))
    .sort()[0];

  return {
    id: model.id,
    slug: adminModelSlug(model),
    title: model.title,
    description: model.description,
    brandSlug: model.brandSlug,
    brandName: adminBrandName(model),
    categorySlug: model.categorySlug,
    price: model.price,
    mrp: model.mrp,
    images,
    rating: 0,
    reviewCount: 0,
    stock,
    isPreorder,
    dropDate,
    isFeatured: false,
    tags: [],
    variants: model.variants,
  };
}

/** Which admin products a storefront surface wants merged in. */
export interface CatalogScope {
  brandSlug?: string;
  categorySlug?: string;
  /** `true` → only pre-orders, `false` → only in-stock/sold-out. */
  preorder?: boolean;
}

export function inScope(product: Product, scope: CatalogScope): boolean {
  if (scope.brandSlug && product.brandSlug !== scope.brandSlug) return false;
  if (scope.categorySlug && product.categorySlug !== scope.categorySlug)
    return false;
  if (scope.preorder !== undefined && product.isPreorder !== scope.preorder)
    return false;
  return true;
}

/** Admin products first (newest work is the interesting work), then the seeded catalog. */
export function mergeProducts(base: Product[], extra: Product[]): Product[] {
  if (extra.length === 0) return base;
  const seen = new Set(extra.map((p) => p.slug));
  return [...extra, ...base.filter((p) => !seen.has(p.slug))];
}
