import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import type { BlobStub } from "./stubs/blob-server";

/**
 * Exercises the real Blob-backed catalogue/orders/audit code against a stub
 * HTTP server (tests/stubs/blob-server.ts) — the same "real code, fake
 * network" approach tests/backup-store.test.ts already uses. This is the
 * replacement for the old tests/db-integration.test.ts, which proved these
 * guarantees against a real Postgres; there is no Postgres to run against
 * anymore, so this proves them against the storage that replaced it.
 */

let stub: BlobStub;

before(async () => {
  const { startBlobStub } = await import("./stubs/blob-server");
  stub = await startBlobStub();
});

beforeEach(() => stub.reset());

after(() => stub.server.close());

function variant(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "v1",
    name: "Matte Black",
    colorHex: "#111111",
    sku: "TW-BLK",
    availability: "in_stock" as const,
    stockQty: 5,
    preorderTarget: 0,
    preorderReserved: 0,
    ...overrides,
  };
}

function model(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    title: "Test Watch",
    description: "A watch",
    brandSlug: "casio",
    categorySlug: "mens-watches" as const,
    price: 1000,
    mrp: 1500,
    imageUrl: "https://example.com/a.jpg",
    images: ["https://example.com/a.jpg"],
    variants: [variant()],
    ...overrides,
  };
}

test("a created product round-trips with its photo intact", async () => {
  const { createProduct, getAdminProduct } = await import("@/lib/data/catalogue");
  const created = await createProduct(model({ title: "Round Trip Watch" }));
  const fetched = await getAdminProduct(created.id);
  assert.equal(fetched?.title, "Round Trip Watch");
  assert.deepEqual(fetched?.images, ["https://example.com/a.jpg"]);
});

test("removing a product never deletes it from the catalogue — only deleted_at is set", async () => {
  const { createProduct, getAdminProduct, softDeleteProduct, readCatalogue } = await import(
    "@/lib/data/catalogue"
  );
  const created = await createProduct(model({ title: "Removable Watch" }));
  await softDeleteProduct(created.id);

  // Gone from the live view...
  assert.equal(await getAdminProduct(created.id), null);

  // ...but still physically present in the stored array.
  const { entries } = await readCatalogue();
  const stored = entries.find((e) => e.id === created.id);
  assert.ok(stored, "the entry must still exist in storage after removal");
  assert.ok(stored!.deleted_at, "deleted_at must be set");
  assert.equal(stored!.title, "Removable Watch");
});

test("a removed product survives a remove/restore round trip with its photo", async () => {
  const { createProduct, softDeleteProduct, restoreProduct, getAdminProduct } = await import(
    "@/lib/data/catalogue"
  );
  const created = await createProduct(model({ images: ["https://example.com/keepsake.jpg"] }));
  await softDeleteProduct(created.id);
  const restored = await restoreProduct(created.id);
  assert.equal(restored?.id, created.id);

  const fetched = await getAdminProduct(created.id);
  assert.deepEqual(fetched?.images, ["https://example.com/keepsake.jpg"]);
});

test("there is no code path in catalogue.ts that removes an entry from the array", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync("src/lib/data/catalogue.ts", "utf8");
  // The only array-shrinking constructs this file may use are .filter()s over
  // a *read* view (listAdminProducts) — never against the array being written.
  assert.ok(!src.includes(".splice("), "catalogue.ts must never splice the stored entries");
  assert.ok(
    !/entries\s*\.filter\([^)]*\)\s*;?\s*\n[^}]*putJSON/.test(src),
    "a filtered (shrunk) array must never be the one written back to storage",
  );
});

test("every catalogue write creates a new, immutable history file — nothing overwrites it", async () => {
  const { createProduct } = await import("@/lib/data/catalogue");
  await createProduct(model({ title: "First" }));
  await createProduct(model({ title: "Second" }));

  const historyBlobs = [...stub.blobs.keys()].filter((k) => k.startsWith("store/catalogue/history/"));
  assert.equal(historyBlobs.length, 2, "each write must produce its own history file");

  // Confirm the earlier version is untouched and still holds only the first product.
  const sorted = historyBlobs.sort();
  const firstVersion = JSON.parse(stub.blobs.get(sorted[0]!)!.body.toString("utf8"));
  assert.equal(firstVersion.length, 1);
  assert.equal(firstVersion[0].title, "First");
});

test("restoring from a backup never overwrites a product that already exists", async () => {
  const { createProduct, updateProduct, readCatalogue, listAdminProducts } = await import(
    "@/lib/data/catalogue"
  );
  const { restoreFromBackup } = await import("@/lib/data/backup");

  const created = await createProduct(model({ title: "Owner Edited This" }));
  // Pretend the admin edited the price after the (stale) backup was taken.
  await updateProduct(created.id, model({ title: "Owner Edited This", price: 9999 }));

  const entry = (await readCatalogue()).entries.find((e) => e.id === created.id)!;
  // A "stale" backup row for the same slug, with the pre-edit price and a
  // different id (as a real old backup file would have, from before ids
  // were regenerated) — it must collide on slug and be skipped.
  const result = await restoreFromBackup({
    products: [{ ...entry, price: 1, id: "different-id-same-slug" }],
    orders: [],
  });

  assert.equal(result.productsSkipped, 1, "a product with an existing slug must be skipped");
  assert.equal(result.productsRestored, 0);

  const stillCurrent = (await listAdminProducts()).find((p) => p.id === created.id)!;
  assert.equal(stillCurrent.price, 9999, "the owner's edit must survive the restore untouched");
});

test("an order survives status changes and is retrievable by id", async () => {
  const { createOrder, getOrderById, updateOrderStatus } = await import("@/lib/data/orders");
  const order = {
    id: "H365-TEST-1",
    items: [],
    details: { name: "A", phone: "1", addressLine1: "x", city: "x", state: "x", pincode: "1", paymentMethod: "cod" as const },
    subtotal: 100,
    shipping: 0,
    total: 100,
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };
  await createOrder(order);
  await updateOrderStatus(order.id, "paid");
  const fetched = await getOrderById(order.id);
  assert.equal(fetched?.status, "paid");
});

test("removing a product's photo from the array never deletes the photo file itself", async () => {
  const { uploadImageBytes } = await import("@/lib/data/images");
  const url = await uploadImageBytes(Buffer.from("fake-jpeg-bytes"), "image/jpeg", "test-watch");
  const pathname = decodeURIComponent(url.replace(/^\/api\/blob-image\//, ""));
  assert.ok(stub.blobs.has(pathname), "the uploaded photo must exist in storage");

  const { createProduct, updateProduct } = await import("@/lib/data/catalogue");
  const created = await createProduct(model({ images: [url] }));
  await updateProduct(created.id, model({ images: [] })); // admin removes the photo from the gallery

  // The catalogue no longer references it, but the file itself was never deleted —
  // there is no delete call anywhere in images.ts or blobClient.ts.
  assert.ok(stub.blobs.has(pathname), "the photo file must still exist even after being removed from a product");
});

/**
 * Reads must not spend from the operation budget.
 *
 * Vercel counts `list()` as an Advanced Operation — 2,000/month included on
 * Hobby — while fetching a blob by its URL is a Simple Operation (10,000
 * included, cache hits free). Every read here used to list the whole store
 * just to work out the URL of a file whose pathname it already knew, so a
 * storefront render, a product photo and a health check each spent from the
 * small budget. Eight days after the store was created the allowance ran out,
 * Vercel locked the store, the catalogue read started returning 403, and the
 * shop quietly fell back to its shipped snapshot — indistinguishable, from the
 * owner's side, from every product having been deleted.
 *
 * Writes still list (they must, to enumerate history). Reads must not.
 */
test("reading the catalogue and one order costs no list() at all", async () => {
  const { createProduct, readCatalogue } = await import("@/lib/data/catalogue");
  const { getOrderById } = await import("@/lib/data/orders");

  await createProduct(model({ slug: "ops-budget", title: "Ops Budget" }));

  const listsAfterWrite = stub.listCalls();
  await readCatalogue();
  await readCatalogue();
  await getOrderById("no-such-order");

  assert.equal(
    stub.listCalls() - listsAfterWrite,
    0,
    "a read of a file whose pathname is known must never list the store",
  );
});

test("the catalogue read still returns what was written, without listing", async () => {
  const { createProduct, readCatalogue } = await import("@/lib/data/catalogue");
  await createProduct(model({ slug: "direct-read", title: "Direct Read" }));
  const { entries } = await readCatalogue();
  assert.equal(entries.length, 1);
  // Slugs get a random suffix on create, as the owner's real products show.
  assert.match(entries[0]?.slug ?? "", /^direct-read-/);
});
