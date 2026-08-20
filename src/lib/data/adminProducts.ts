import type { AdminModel, Variant } from "@/lib/types";

/** Pure AdminModel <-> `products` row mapping + derived-field computation,
 *  used by the admin product API routes (src/app/api/admin/products/**). */

/** Columns the admin routes select when returning an AdminModel. */
export const PRODUCT_COLUMNS =
  "id, slug, title, description, brand_slug, category_slug, price, mrp, images, variants, created_at";

export interface ProductInsertRow {
  slug: string;
  title: string;
  description: string;
  brand_slug: string;
  category_slug: string;
  price: number;
  mrp: number;
  images: { url: string; alt: string }[];
  stock: number;
  is_preorder: boolean;
  drop_date: string | null;
  variants: Variant[];
}

export interface ProductRowForAdmin {
  id: string;
  slug: string;
  title: string;
  description: string;
  brand_slug: string;
  category_slug: string;
  price: number;
  mrp: number;
  images: { url: string; alt: string }[];
  variants: Variant[];
  created_at: string;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function unitsInStock(variants: Variant[]): number {
  return variants.reduce(
    (sum, v) => sum + (v.availability !== "preorder" ? v.stockQty : 0),
    0,
  );
}

export function preordersReserved(variants: Variant[]): number {
  return variants.reduce((sum, v) => sum + v.preorderReserved, 0);
}

export function computeDerivedFields(variants: Variant[]) {
  const stock = unitsInStock(variants);
  const isPreorder = stock <= 0 && variants.some((v) => v.availability === "preorder");
  const dropDate =
    variants.find((v) => v.availability === "preorder" && v.dropDate)?.dropDate || null;
  return { stock, isPreorder, dropDate };
}

/** Builds an insertable row from a freshly-authored admin model (no id yet —
 *  Postgres generates it). Ensures a unique slug via a short random suffix. */
export function adminModelToInsertRow(model: Omit<AdminModel, "id" | "createdAt">): ProductInsertRow {
  const { stock, isPreorder, dropDate } = computeDerivedFields(model.variants);
  const gallery = model.images?.length ? model.images : [model.imageUrl];
  const suffix = Math.random().toString(36).slice(2, 8);

  return {
    slug: `${slugify(model.title)}-${suffix}`,
    title: model.title,
    description: model.description,
    brand_slug: model.brandSlug,
    category_slug: model.categorySlug,
    price: model.price,
    mrp: model.mrp,
    images: gallery.map((url) => ({ url, alt: model.title })),
    stock,
    is_preorder: isPreorder,
    drop_date: dropDate,
    variants: model.variants,
  };
}

/** Builds the update payload for an edit. The slug is deliberately left alone
 *  so a product's public URL survives a title change. */
export function adminModelToUpdateRow(
  model: Omit<AdminModel, "id" | "createdAt">,
): Omit<ProductInsertRow, "slug"> {
  const { slug: _slug, ...rest } = adminModelToInsertRow(model);
  return rest;
}

export function rowToAdminModel(row: ProductRowForAdmin): AdminModel {
  const gallery = row.images?.length ? row.images.map((i) => i.url) : [];
  return {
    id: row.id,
    brandSlug: row.brand_slug,
    title: row.title,
    categorySlug: row.category_slug as AdminModel["categorySlug"],
    description: row.description,
    price: row.price,
    mrp: row.mrp,
    imageUrl: gallery[0] ?? "",
    images: gallery,
    variants: row.variants ?? [],
    createdAt: row.created_at,
  };
}
