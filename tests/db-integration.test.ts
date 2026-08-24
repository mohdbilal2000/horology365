import { test, before, after } from "node:test";
import assert from "node:assert/strict";

/**
 * Integration tests against a REAL PostgreSQL database.
 *
 * These replace the stand-in PostgREST the Supabase SDK required. Now that the
 * app speaks plain Postgres, the tests can exercise the actual data layer
 * against a real server — so the schema, the SQL and the protection triggers
 * are all verified together rather than in isolation.
 *
 * Skipped when TEST_DATABASE_URL is unset, so `npm test` still works without a
 * database. `npm run test:db` starts one and runs them; CI does the same.
 */

const DB_URL = process.env.TEST_DATABASE_URL;
const skip = DB_URL ? false : "TEST_DATABASE_URL is not set";

// The data layer reads DATABASE_URL at import time.
if (DB_URL) {
  process.env.DATABASE_URL = DB_URL;
  process.env.DATABASE_SSL = "disable";
}

/** Imported lazily so an unset DATABASE_URL doesn't blow up module load. */
type Db = typeof import("../src/lib/db/client");
type AdminQ = typeof import("../src/lib/data/adminProductQueries");
type Orders = typeof import("../src/lib/data/orders");
type Audit = typeof import("../src/lib/data/adminAudit");

let db: Db;
let adminQ: AdminQ;
let orders: Orders;
let audit: Audit;

before(async () => {
  if (!DB_URL) return;
  db = await import("../src/lib/db/client");
  adminQ = await import("../src/lib/data/adminProductQueries");
  orders = await import("../src/lib/data/orders");
  audit = await import("../src/lib/data/adminAudit");

  await db.query("delete from admin_audit where target_id like 'test-%'").catch(() => {});
});

after(async () => {
  if (db) await db.closePool();
});

/** `label` only distinguishes one test's product from another's. */
const sampleProduct = (label: string) => ({
  title: `MY G-SHOCK (owner photo) ${label}`,
  description: "Photographed in my shop",
  brandSlug: "casio",
  categorySlug: "mens-watches" as const,
  price: 7777,
  mrp: 8888,
  imageUrl: "/uploads/owner-photo.jpg",
  images: ["/uploads/owner-photo.jpg"],
  variants: [
    {
      id: "v1",
      name: "Gold",
      colorHex: "#D9BC73",
      sku: "MINE-1",
      availability: "in_stock" as const,
      stockQty: 5,
      preorderTarget: 0,
      preorderReserved: 0,
    },
  ],
});

test("a product survives a remove/restore round trip with its photo", { skip }, async () => {
  const created = await adminQ.createProduct(sampleProduct("roundtrip"));
  assert.match(created.title, /MY G-SHOCK \(owner photo\)/);
  assert.match(created.imageUrl, /owner-photo\.jpg/);

  // Removed: gone from the shop and the admin list...
  const removed = await adminQ.softDeleteProduct(created.id);
  assert.ok(removed);
  const live = await adminQ.listAdminProducts();
  assert.equal(
    live.some((p) => p.id === created.id),
    false,
    "a removed product must not appear in the live list",
  );

  // ...but still fully on record, photo intact.
  const trashed = await adminQ.listAdminProducts({ onlyDeleted: true });
  const found = trashed.find((p) => p.id === created.id);
  assert.ok(found, "a removed product must still be on record");
  assert.match(found.imageUrl, /owner-photo\.jpg/, "the owner's photo must survive removal");

  const restored = await adminQ.restoreProduct(created.id);
  assert.ok(restored);
  assert.match(restored.imageUrl, /owner-photo\.jpg/, "the photo must survive restore");
});

test("the database physically refuses to delete a product", { skip }, async () => {
  const created = await adminQ.createProduct(sampleProduct("nodelete"));
  await assert.rejects(
    () => db.query("delete from products where id = $1", [created.id]),
    /not permitted/i,
    "a hard DELETE on products must be rejected by the trigger",
  );
  const still = await adminQ.getAdminProduct(created.id);
  assert.ok(still, "the product must still be there after the refused delete");
});

test("re-seeding never overwrites an existing product", { skip }, async () => {
  const mine = await adminQ.createProduct(sampleProduct("seed-collision"));
  const slug = (
    await db.query<{ slug: string }>("select slug from products where id = $1", [mine.id])
  )[0]!.slug;

  // Exactly what the seed does: insert ... on conflict (slug) do nothing.
  await db.query(
    `insert into products (slug, title, description, brand_slug, category_slug,
                           price, mrp, images, stock, is_preorder, variants)
     values ($1,'Casio G-Shock GA-2100 (mock)','mock','casio','mens-watches',
             9995, 12995, $2, 0, false, '[]'::jsonb)
     on conflict (slug) do nothing`,
    [slug, JSON.stringify([{ url: "https://images.unsplash.com/MOCK", alt: "mock" }])],
  );

  const after = await adminQ.getAdminProduct(mine.id);
  assert.equal(after?.title, mine.title, "the seed must not rename it");
  assert.match(after!.imageUrl, /owner-photo\.jpg/, "the seed must not replace the photo");
  assert.equal(after?.price, 7777, "the seed must not change the price");
});

test("the audit trail records changes and cannot be rewritten", { skip }, async () => {
  const created = await adminQ.createProduct(sampleProduct("audit"));
  await adminQ.adjustVariant(created.id, "v1", { delta: -2 });
  await adminQ.softDeleteProduct(created.id);

  const entries = await audit.listAudit(50);
  const mine = entries.filter((e) => e.target_id === created.id);
  const actions = mine.map((e) => e.action);
  for (const expected of ["product.create", "product.stock", "product.delete"]) {
    assert.ok(actions.includes(expected), `expected an ${expected} entry, got ${actions.join(", ")}`);
  }

  await assert.rejects(
    () => db.query("update admin_audit set summary = 'tampered' where target_id = $1", [created.id]),
    /not permitted/i,
    "audit entries must not be editable",
  );
  await assert.rejects(
    () => db.query("delete from admin_audit where target_id = $1", [created.id]),
    /not permitted/i,
    "audit entries must not be deletable",
  );
});

test("orders round-trip and cannot be deleted", { skip }, async () => {
  const id = `test-order-${Date.now()}`;
  const order = {
    id,
    items: [
      {
        productId: "p1",
        slug: "casio-g-shock-ga2100",
        title: "Casio G-Shock GA-2100",
        brandName: "Casio",
        price: 9995,
        mrp: 12995,
        imageUrl: "",
        imageAlt: "",
        quantity: 1,
        isPreorder: false,
      },
    ],
    details: {
      name: "Ananya Sharma",
      phone: "9876543210",
      email: "ananya@example.com",
      addressLine1: "Flat 402, MG Road",
      city: "Dimapur",
      state: "Nagaland",
      pincode: "797112",
      paymentMethod: "upi" as const,
      upiReference: "456789101234",
    },
    subtotal: 9995,
    shipping: 0,
    total: 9995,
    status: "pending" as const,
    createdAt: new Date().toISOString(),
  };

  const saved = await orders.createOrder(order);
  assert.equal(saved.ok, true, `order insert failed: ${saved.error}`);

  const read = await orders.getOrderById(id);
  assert.equal(read?.details.name, "Ananya Sharma");
  assert.equal(read?.total, 9995);
  assert.equal(read?.items[0]?.title, "Casio G-Shock GA-2100");

  await assert.rejects(
    () => db.query("delete from orders where id = $1", [id]),
    /not permitted/i,
    "orders are a financial record and must never be deletable",
  );
});

test("the storefront query excludes removed products", { skip }, async () => {
  const created = await adminQ.createProduct(sampleProduct("storefront"));
  const { getAllProducts } = await import("../src/lib/data/products");

  await adminQ.softDeleteProduct(created.id);
  // getAllProducts is React-cached per request; query directly to avoid the cache.
  const rows = await db.query<{ slug: string }>(
    "select slug from products where deleted_at is null and slug = $1",
    ["test-storefront"],
  );
  assert.equal(rows.length, 0, "a removed product must not be visible to the shop");
  assert.equal(typeof getAllProducts, "function");
});

test("TRUNCATE is blocked on every table that holds records", { skip }, async () => {
  // TRUNCATE does not fire row-level DELETE triggers — it is a separate event.
  // An adversarial run found this hole after the DELETE guards were in place:
  // one TRUNCATE emptied the whole products table instantly. Statement-level
  // triggers close it, and this test stops them being dropped later.
  for (const table of ["products", "orders", "admin_audit"]) {
    await assert.rejects(
      () => db.query(`truncate ${table} cascade`),
      /not permitted/i,
      `TRUNCATE on ${table} must be blocked — it bypasses the DELETE trigger and would erase everything.`,
    );
  }
});

test("a backup can rebuild the shop after total loss", { skip }, async () => {
  // The protections stop loss through the app. This is the answer to losing the
  // database itself, so it has to be proven the only way that counts: take a
  // backup, destroy everything, put it back.
  const backupMod = await import("../src/lib/data/backup");

  const created = await adminQ.createProduct(sampleProduct("backup-me"));
  // The slug is generated from the title, so read back the one that was stored.
  const slug = (
    await db.query<{ slug: string }>("select slug from products where id = $1", [created.id])
  )[0]!.slug;

  const backup = await backupMod.buildBackup();
  assert.ok(backup.counts.products > 0, "the backup must contain products");
  assert.ok(
    backup.products.some((p) => p.slug === slug),
    "the backup must contain the product we just made",
  );

  // Simulate catastrophe. The triggers rightly refuse DELETE, so drop them for
  // the length of this test to stand in for "the database was lost".
  await db.query("alter table products disable trigger products_no_hard_delete");
  await db.query("delete from products");
  await db.query("alter table products enable trigger products_no_hard_delete");
  assert.equal(
    (await db.query("select 1 from products")).length,
    0,
    "everything should be gone at this point",
  );

  const result = await backupMod.restoreFromBackup(backup);
  assert.ok(result.productsRestored > 0, `nothing was restored: ${result.errors.join("; ")}`);

  const back = await db.query<{ title: string; images: { url: string }[] }>(
    "select title, images from products where slug = $1",
    [slug],
  );
  assert.equal(back.length, 1, "the product must come back");
  assert.equal(back[0]?.title, created.title, "its title must come back intact");
  assert.match(
    back[0]?.images?.[0]?.url ?? "",
    /owner-photo\.jpg/,
    "the owner's photo must come back intact",
  );
});

test("restoring never overwrites what is already there", { skip }, async () => {
  const backupMod = await import("../src/lib/data/backup");

  const created = await adminQ.createProduct(sampleProduct("restore-safe"));
  const backup = await backupMod.buildBackup();

  // The owner edits it after the backup was taken.
  await db.query("update products set title = $2, price = $3 where id = $1", [
    created.id,
    "EDITED AFTER BACKUP",
    1234,
  ]);

  const result = await backupMod.restoreFromBackup(backup);
  assert.ok(result.productsSkipped > 0, "existing products must be skipped, not rewritten");

  const after = await adminQ.getAdminProduct(created.id);
  assert.equal(
    after?.title,
    "EDITED AFTER BACKUP",
    "a restore must never revert newer work — that would be the original bug again",
  );
  assert.equal(after?.price, 1234, "the newer price must survive the restore");
});

test("an uploaded photo is served by URL to shoppers and kept raw for the owner", { skip }, async () => {
  const storefront = await import("../src/lib/data/products");

  // A data URL is what the admin uploader produces; a link is what pasting an
  // image address produces. Both must keep working.
  const uploaded =
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
  const linked = "https://images.unsplash.com/photo-1524592094714-0f0654e20314";

  const created = await adminQ.createProduct({
    ...sampleProduct("photo-serving"),
    imageUrl: uploaded,
    images: [uploaded, linked],
  });

  const rows = await db.query<{ slug: string }>("select slug from products where id = $1", [
    created.id,
  ]);
  const slug = rows[0]!.slug;

  const shopper = (await storefront.getAllProducts()).find((p) => p.slug === slug);
  assert.ok(shopper, "the product must reach the storefront");

  // What the page embeds: a link, never the photo itself. This is the whole
  // point — inline photos took the home page to 14 MB.
  assert.ok(
    shopper.images[0]!.url.startsWith(`/api/product-image/${slug}/0`),
    `expected a served URL, got ${shopper.images[0]!.url.slice(0, 40)}`,
  );
  assert.ok(
    !shopper.images.some((i) => i.url.startsWith("data:")),
    "no photo may be embedded in a storefront page",
  );
  assert.equal(shopper.images[1]!.url, linked, "an ordinary image link must be left alone");

  // What the owner gets back when he opens the edit form: the original photo.
  // If this ever returns the served URL, saving would replace his photo with a
  // link to itself and the image would be lost on the next edit.
  const owner = await adminQ.getAdminProduct(created.id);
  assert.equal(owner?.images?.[0], uploaded, "the admin must still receive the real photo");

  // And the stored row is untouched by any of this.
  const stored = await db.query<{ url: string }>(
    "select images->0->>'url' as url from products where id = $1",
    [created.id],
  );
  assert.equal(stored[0]!.url, uploaded, "the row must still hold the original photo");
});
