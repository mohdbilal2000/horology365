import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOGUE_SNAPSHOT } from "@/lib/data/catalogueSnapshot";
import { products as demoProducts } from "@/lib/mock/products";

/**
 * When the database stopped answering, the storefront fell back to the built-in
 * demo catalogue: 28 sample watches with stock photos and invented prices, shown
 * to real customers, several of whom tried to buy them. The owner's report was
 * "none of my watches are listed".
 *
 * The shipped snapshot is his own stock, and it must never be empty or contain
 * demo entries — an empty snapshot silently reopens that exact hole.
 */

test("the shipped catalogue is the owner's real stock, not empty", () => {
  assert.ok(
    CATALOGUE_SNAPSHOT.length > 0,
    "an empty snapshot means a database outage shows customers nothing, or worse, demo stock",
  );
});

test("no demo product can reach the shipped catalogue", () => {
  const demoSlugs = new Set(demoProducts.map((p) => p.slug));
  const leaked = CATALOGUE_SNAPSHOT.filter((p) => demoSlugs.has(p.slug));
  assert.deepEqual(leaked.map((p) => p.slug), [], "demo watches must never be sold as real stock");
});

test("every shipped product has a price, a photo and a brand", () => {
  for (const p of CATALOGUE_SNAPSHOT) {
    assert.ok(p.price > 0, `${p.slug} has no price`);
    assert.ok(p.brandSlug, `${p.slug} has no brand`);
    assert.ok(p.images.length > 0, `${p.slug} has no photo`);
    assert.ok(
      p.images.every((i) => !i.url.startsWith("data:")),
      `${p.slug} embeds a photo in the page instead of serving a file`,
    );
  }
});
