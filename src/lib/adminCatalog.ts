import type { AdminModel, Product } from "@/lib/types";

/** Admin samples that already have a matching seed product in the static
 *  catalogue — excluded from the storefront so they don't show twice. */
const SAMPLE_MODEL_IDS = new Set(["m-sample-gshock", "m-sample-lexington"]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function unitsInStock(model: AdminModel): number {
  return model.variants.reduce(
    (sum, v) => sum + (v.availability !== "preorder" ? v.stockQty : 0),
    0,
  );
}

/** Converts an admin-built Brand → Model → Variant record into the flat
 *  `Product` shape the storefront pages render. */
export function adminModelToProduct(model: AdminModel): Product {
  const stock = unitsInStock(model);
  const isPreorder =
    stock <= 0 && model.variants.some((v) => v.availability === "preorder");
  const dropDate = model.variants.find(
    (v) => v.availability === "preorder" && v.dropDate,
  )?.dropDate;
  const gallery = model.images?.length ? model.images : [model.imageUrl];

  return {
    id: model.id,
    slug: `${slugify(model.title)}-${model.id.slice(-6)}`,
    title: model.title,
    description: model.description,
    brandSlug: model.brandSlug,
    categorySlug: model.categorySlug,
    price: model.price,
    mrp: model.mrp,
    images: gallery.map((url) => ({ url, alt: model.title })),
    rating: 0,
    reviewCount: 0,
    stock,
    isPreorder,
    dropDate,
    isFeatured: false,
    tags: [],
  };
}

export function adminModelsToProducts(models: AdminModel[]): Product[] {
  return models
    .filter((m) => !SAMPLE_MODEL_IDS.has(m.id))
    .map(adminModelToProduct);
}
