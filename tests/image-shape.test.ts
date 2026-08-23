import { test } from "node:test";
import assert from "node:assert/strict";
import { adminModelToInsertRow, rowToAdminModel } from "@/lib/data/adminProducts";
import type { AdminModel, Variant } from "@/lib/types";

/**
 * One malformed image entry used to take the whole storefront down: the admin
 * API accepted `images: [{url, alt}]`, stored it nested as `{url: {url, alt}}`,
 * and every product card then called `.startsWith` on an object — 500ing the
 * home, brand and category pages until the row was hidden.
 *
 * These tests pin the rule: whatever shape comes in, a flat URL string goes
 * into the database. If one fails, a single admin save can break the shop.
 */

const variants: Variant[] = [
  {
    id: "v1", name: "Matte Black", colorHex: "#111111", sku: "TW-BLK",
    availability: "in_stock", stockQty: 2, preorderTarget: 0, preorderReserved: 0,
  },
];

function model(images: unknown): Omit<AdminModel, "id" | "createdAt"> {
  return {
    title: "Test Watch", description: "d", brandSlug: "casio",
    categorySlug: "mens-watches", price: 100, mrp: 200,
    imageUrl: "https://example.com/a.jpg",
    images: images as string[], variants,
  };
}

test("plain string gallery is stored flat", () => {
  const row = adminModelToInsertRow(model(["https://example.com/a.jpg"]));
  assert.equal(row.images[0]!.url, "https://example.com/a.jpg");
  assert.equal(typeof row.images[0]!.url, "string");
});

test("object gallery is flattened, not nested", () => {
  const row = adminModelToInsertRow(model([{ url: "https://example.com/b.jpg", alt: "b" }]));
  assert.equal(typeof row.images[0]!.url, "string", "url must never be an object");
  assert.equal(row.images[0]!.url, "https://example.com/b.jpg");
});

test("an uploaded data URL survives intact", () => {
  const dataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
  const row = adminModelToInsertRow(model([dataUrl]));
  assert.equal(row.images[0]!.url, dataUrl);
});

test("unusable entries are dropped rather than stored as junk", () => {
  const row = adminModelToInsertRow(model([null, 42, { nope: 1 }, "https://example.com/ok.jpg"]));
  assert.equal(row.images.length, 1);
  assert.equal(row.images[0]!.url, "https://example.com/ok.jpg");
});

test("reading a row already corrupted in the database recovers the URL", () => {
  const recovered = rowToAdminModel({
    id: "1", slug: "s", title: "t", description: "d", brand_slug: "casio",
    category_slug: "mens-watches", price: 1, mrp: 2,
    images: [{ url: { url: "https://example.com/c.jpg", alt: "c" }, alt: "t" }] as never,
    variants, created_at: new Date(0).toISOString(),
  });
  assert.equal(recovered.imageUrl, "https://example.com/c.jpg");
});
