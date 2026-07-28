import type { AdminModel, Product } from "@/lib/types";

/** URL-safe slug from arbitrary text, e.g. for turning an admin model title into a route segment. */
function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product"
  );
}

/** Stable, human-readable slug for an admin-added model's storefront page. */
export function adminModelSlug(model: AdminModel): string {
  return `${slugify(model.brandSlug)}-${slugify(model.title)}`;
}

/**
 * Project an admin-authored Brand → Model → Variant record into the flat
 * `Product` shape the storefront pages render. Variants aren't modelled on
 * the storefront yet, so we roll them up: total stock across non-preorder
 * variants, and preorder status only when every variant is a preorder.
 */
export function modelToProduct(model: AdminModel): Product {
  const gallery = model.images?.length ? model.images : [model.imageUrl];
  const stock = model.variants.reduce(
    (sum, v) => sum + (v.availability !== "preorder" ? v.stockQty : 0),
    0,
  );
  const isPreorder =
    model.variants.length > 0 &&
    model.variants.every((v) => v.availability === "preorder");
  const dropDate = model.variants
    .map((v) => v.dropDate)
    .filter((d): d is string => Boolean(d))
    .sort()[0];

  return {
    id: model.id,
    slug: adminModelSlug(model),
    title: model.title,
    description: model.description,
    brandSlug: model.brandSlug,
    categorySlug: model.categorySlug,
    price: model.price,
    mrp: model.mrp,
    images: gallery.map((url, i) => ({
      url,
      alt: i === 0 ? `${model.title} — front view` : `${model.title} — detail`,
    })),
    rating: 0,
    reviewCount: 0,
    stock,
    isPreorder,
    dropDate,
    isFeatured: false,
    tags: [],
  };
}
