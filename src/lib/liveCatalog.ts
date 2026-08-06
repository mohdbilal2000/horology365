"use client";

import { useEffect, useMemo, useState } from "react";
import { useCatalogStore } from "@/lib/store/catalog";
import { products as mockProducts } from "@/lib/mock/products";
import type { AdminModel, Product } from "@/lib/types";

/**
 * Live catalog bridge — turns models published in the admin (Phase-1
 * localStorage store) into storefront `Product`s and merges them with the
 * built-in mock catalog, so anything the admin adds shows up on the shop
 * immediately. In Phase 2 the storefront reads the same rows from Supabase
 * and this client-side merge disappears.
 */

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Units sellable right now (anything not still in a pre-order batch). */
const sellableStock = (model: AdminModel): number =>
  model.variants.reduce(
    (sum, v) => sum + (v.availability !== "preorder" ? v.stockQty : 0),
    0,
  );

export function adminModelToProduct(model: AdminModel, slug: string): Product {
  const gallery = (model.images?.length ? model.images : [model.imageUrl]).filter(
    Boolean,
  );
  const preorderOnly =
    model.variants.length > 0 &&
    model.variants.every((v) => v.availability === "preorder");
  const dropDate = model.variants.find(
    (v) => v.availability === "preorder" && v.dropDate,
  )?.dropDate;

  return {
    id: model.id,
    slug,
    title: model.title,
    description:
      model.description ||
      `${model.title} — brand new in the Horology365 showroom. 100% authentic with brand warranty.`,
    brandSlug: model.brandSlug,
    categorySlug: model.categorySlug,
    price: model.price,
    mrp: model.mrp,
    images: gallery.map((url, i) => ({
      url,
      alt: i === 0 ? `${model.title} — front view` : `${model.title} — view ${i + 1}`,
    })),
    rating: 5,
    reviewCount: 0,
    stock: sellableStock(model),
    isPreorder: preorderOnly,
    dropDate: dropDate || undefined,
    isFeatured: false,
    tags: ["new-arrival"],
  };
}

/**
 * Convert every admin-published model to a storefront product with a unique,
 * stable slug. The seeded demo samples stay admin-only so they never pollute
 * the public shop.
 */
export function adminProductsFromModels(models: AdminModel[]): Product[] {
  const taken = new Set(mockProducts.map((p) => p.slug));
  return models
    .filter((m) => !m.id.startsWith("m-sample-"))
    .map((model) => {
      const base = slugify(`${model.brandSlug} ${model.title}`) || model.id;
      let slug = base;
      for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
      taken.add(slug);
      return adminModelToProduct(model, slug);
    });
}

/**
 * Admin-published products, hydration-safe: returns [] on the server and on
 * the first client render, then the real list once localStorage has loaded.
 */
export function useAdminProducts(): Product[] {
  const models = useCatalogStore((s) => s.models);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return useMemo(
    () => (ready ? adminProductsFromModels(models) : []),
    [ready, models],
  );
}

/** Look up a single admin product by its storefront slug. */
export function useAdminProduct(slug: string): {
  product: Product | undefined;
  ready: boolean;
} {
  const models = useCatalogStore((s) => s.models);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const product = useMemo(
    () =>
      ready
        ? adminProductsFromModels(models).find((p) => p.slug === slug)
        : undefined,
    [ready, models, slug],
  );
  return { product, ready };
}
