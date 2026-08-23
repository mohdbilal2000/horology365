import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * Behavioural tests for the admin product routes.
 *
 * The guardrails in data-safety.test.ts check what the source says. These check
 * what the code actually *does*: the routes are executed against a stand-in
 * PostgREST that records every request, so we can assert the real HTTP call —
 * the verb, the filters and the headers — rather than trusting a regex.
 *
 * That matters most for the seed. `ignoreDuplicates: true` is only meaningful
 * if it reaches Postgres as `Prefer: resolution=ignore-duplicates`; if it were
 * `merge-duplicates`, seeding would overwrite the owner's products exactly as
 * it did before.
 */

interface Captured {
  method: string;
  path: string;
  query: URLSearchParams;
  prefer: string;
  body: unknown;
}

let server: Server;
let captured: Captured[] = [];
/** What the fake PostgREST should answer with next. */
let reply: unknown = {};

before(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const url = new URL(req.url ?? "/", "http://localhost");
      const raw = Buffer.concat(chunks).toString("utf8");
      captured.push({
        method: req.method ?? "",
        path: url.pathname,
        query: url.searchParams,
        prefer: String(req.headers["prefer"] ?? ""),
        body: raw ? JSON.parse(raw) : null,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(reply));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  const { port } = server.address() as AddressInfo;
  process.env.NEXT_PUBLIC_SUPABASE_URL = `http://127.0.0.1:${port}`;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service";
});

after(() => {
  server.close();
});

/** A product row shaped the way the routes expect to read one back. */
const PRODUCT_ROW = {
  id: "prod-1",
  slug: "casio-g-shock-ga2100",
  title: "MY G-SHOCK (owner photo)",
  description: "",
  brand_slug: "casio",
  category_slug: "mens-watches",
  price: 7777,
  mrp: 8888,
  images: [{ url: "/uploads/owner-photo.jpg", alt: "my shop photo" }],
  variants: [],
  created_at: "2026-08-01T00:00:00.000Z",
};

function reset(next: unknown) {
  captured = [];
  reply = next;
}


/**
 * Runs a route handler, tolerating the one failure that is an artifact of
 * testing outside Next: `revalidatePath` needs a request context we don't have.
 * It runs *after* the database write, so everything these tests assert on has
 * already happened by then. Any other error is a real failure and is rethrown.
 */
async function runRoute<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/static generation store missing|revalidatePath/.test(message)) return null;
    throw err;
  }
}

/** Finds the request that touched the products table. */
function productCall(): Captured {
  const hit = captured.find((c) => c.path.endsWith("/products"));
  assert.ok(hit, `no request to /products was made (saw: ${captured.map((c) => c.path).join(", ")})`);
  return hit;
}

test("removing a product PATCHes deleted_at — it never issues a DELETE", async () => {
  reset(PRODUCT_ROW);
  const { DELETE } = await import("../src/app/api/admin/products/[id]/route");

  const res = await runRoute(() =>
    DELETE(new Request("http://test/api/admin/products/prod-1"), {
      params: Promise.resolve({ id: "prod-1" }),
    }),
  );

  const call = productCall();
  assert.notEqual(
    call.method,
    "DELETE",
    "The route must never send an HTTP DELETE for a product.",
  );
  assert.equal(call.method, "PATCH", "Removal should be an update, not a delete.");
  assert.equal(call.query.get("id"), "eq.prod-1");
  assert.equal(
    call.query.get("deleted_at"),
    "is.null",
    "Removal must only apply to a product that isn't already removed.",
  );

  const body = call.body as { deleted_at?: string };
  assert.ok(body.deleted_at, "deleted_at must be stamped.");
  assert.ok(!Number.isNaN(Date.parse(body.deleted_at)), "deleted_at must be a timestamp.");
  if (res) assert.equal(res.status, 200);
});

test("restoring a product clears deleted_at and keeps its images", async () => {
  reset({ ...PRODUCT_ROW, deleted_at: null });
  const { POST } = await import("../src/app/api/admin/products/[id]/route");

  const res = await runRoute(() =>
    POST(new Request("http://test/api/admin/products/prod-1", { method: "POST" }), {
      params: Promise.resolve({ id: "prod-1" }),
    }),
  );

  const call = productCall();
  assert.equal(call.method, "PATCH");
  assert.equal(call.query.get("id"), "eq.prod-1");
  assert.deepEqual(
    (call.body as { deleted_at: unknown }).deleted_at,
    null,
    "Restore must clear deleted_at.",
  );

  // The response body is only available when the handler ran to completion.
  if (res) {
    const json = (await res.json()) as { model?: { images?: { url: string }[] } };
    assert.equal(
      json.model?.images?.[0]?.url,
      "/uploads/owner-photo.jpg",
      "The owner's uploaded image must survive a remove/restore round trip.",
    );
  }
});

test("the storefront never asks for removed products", async () => {
  reset([]);
  const { getAllProducts } = await import("../src/lib/data/products");
  await getAllProducts();

  const call = productCall();
  assert.equal(call.method, "GET");
  assert.equal(
    call.query.get("deleted_at"),
    "is.null",
    "The shop query must exclude soft-deleted products.",
  );
});

test("seeding asks Postgres to IGNORE duplicates, not merge them", async () => {
  reset([]);
  const { POST } = await import("../src/app/api/admin/seed/route");
  await runRoute(() => POST());

  const productPost = captured.find(
    (c) => c.path.endsWith("/products") && c.method === "POST",
  );
  assert.ok(productPost, "the seed should POST products");

  // This single assertion is the difference between the incident and not.
  assert.match(
    productPost.prefer,
    /resolution=ignore-duplicates/,
    `The products seed must send Prefer: resolution=ignore-duplicates so an existing ` +
      `product is skipped. Got "${productPost.prefer}" — "merge-duplicates" would ` +
      `overwrite the owner's products and their uploaded images.`,
  );
  assert.doesNotMatch(
    productPost.prefer,
    /resolution=merge-duplicates/,
    "The products seed must never merge (overwrite) existing rows.",
  );
});

test("an invoice link without a valid signature is refused", async () => {
  const { verifyInvoiceToken, invoiceToken, invoicePath } = await import(
    "../src/lib/orders/invoiceLink"
  );

  const id = "H365-TEST-0001";
  const good = invoiceToken(id);

  assert.equal(verifyInvoiceToken(id, good), true, "the real token must verify");
  assert.equal(verifyInvoiceToken(id, null), false, "a missing token must be refused");
  assert.equal(verifyInvoiceToken(id, "0".repeat(32)), false, "a wrong token must be refused");
  assert.equal(
    verifyInvoiceToken("H365-TEST-0002", good),
    false,
    "a token must not work for a different order — otherwise one leaked link opens all of them",
  );
  assert.match(invoicePath(id), /\?t=[0-9a-f]{32}$/);
});

test("the invoice route renders a real PDF only for a correctly signed link", async () => {
  const { invoiceToken } = await import("../src/lib/orders/invoiceLink");
  const { GET } = await import("../src/app/api/orders/[id]/invoice/route");

  const id = "H365-TEST-0001";
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
      paymentMethod: "upi",
    },
    status: "pending",
    subtotal: 9995,
    shipping: 0,
    total: 9995,
    created_at: "2026-08-23T00:00:00.000Z",
  };

  // Unsigned: refused, and the database is never even consulted.
  reset(order);
  const denied = await GET(new Request(`http://test/api/orders/${id}/invoice`), {
    params: Promise.resolve({ id }),
  });
  assert.equal(denied.status, 404, "an unsigned invoice link must be refused");
  assert.equal(
    captured.length,
    0,
    "a refused request must not hit the database — that is what stops id-walking",
  );

  // Signed: a real PDF comes back.
  reset(order);
  const ok = await GET(
    new Request(`http://test/api/orders/${id}/invoice?t=${invoiceToken(id)}`),
    { params: Promise.resolve({ id }) },
  );
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("content-type"), "application/pdf");

  const bytes = Buffer.from(await ok.arrayBuffer());
  assert.equal(
    bytes.subarray(0, 5).toString("latin1"),
    "%PDF-",
    "the response must be a real PDF, not an error page",
  );
  assert.ok(bytes.length > 1000, `PDF looks truncated (${bytes.length} bytes)`);
});
