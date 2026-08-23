import { test } from "node:test";
import assert from "node:assert/strict";
import {
  unitsInStock, preordersReserved, preorderTarget, preorderRemaining,
  stockValue, stockValueAtMrp, discountPerUnit, discountPercent,
  totalDiscountOnStock, preorderValue, inventoryTotals,
} from "../src/lib/inventory";
import type { AdminModel } from "../src/lib/types";

/**
 * Every figure the admin sees comes from these functions. He is expected to be
 * able to check them against his own shelf and his own arithmetic, so they are
 * pinned here with numbers that can be worked out by hand.
 */

const model = (over: Partial<AdminModel> = {}): AdminModel => ({
  id: "m1",
  brandSlug: "casio",
  title: "Test",
  categorySlug: "mens-watches",
  description: "",
  price: 1000,
  mrp: 1250,
  imageUrl: "",
  createdAt: "2026-08-01T00:00:00.000Z",
  variants: [
    { id: "a", name: "Black", colorHex: "#000", sku: "A", availability: "in_stock",
      stockQty: 10, preorderTarget: 0, preorderReserved: 0 },
    { id: "b", name: "Gold", colorHex: "#DDD", sku: "B", availability: "preorder",
      stockQty: 0, preorderTarget: 50, preorderReserved: 20 },
  ],
  ...over,
});

test("stock counts exclude pre-order rows, which hold no stock yet", () => {
  assert.equal(unitsInStock(model()), 10);
  assert.equal(preordersReserved(model()), 20);
  assert.equal(preorderTarget(model()), 50);
  assert.equal(preorderRemaining(model()), 30, "50 in the batch, 20 spoken for");
});

test("values follow from units x price, and nothing else", () => {
  assert.equal(stockValue(model()), 10 * 1000);
  assert.equal(stockValueAtMrp(model()), 10 * 1250);
  assert.equal(preorderValue(model()), 20 * 1000, "reserved units at the selling price");
});

test("discount is MRP minus price, and never goes negative", () => {
  assert.equal(discountPerUnit(model()), 250);
  assert.equal(discountPercent(model()), 20, "250 off 1250 is 20%");
  assert.equal(totalDiscountOnStock(model()), 10 * 250);

  // A price entered above MRP must not show as a negative discount.
  const odd = model({ price: 1500, mrp: 1250 });
  assert.equal(discountPerUnit(odd), 0);
  assert.equal(discountPercent(odd), 0);

  // No MRP on file means nothing to discount from.
  assert.equal(discountPercent(model({ mrp: 0 })), 0);
});

test("dashboard totals add up across products", () => {
  const t = inventoryTotals([model(), model({ id: "m2", price: 500, mrp: 500 })]);
  assert.equal(t.products, 2);
  assert.equal(t.variants, 4);
  assert.equal(t.unitsInStock, 20, "10 from each");
  assert.equal(t.stockValue, 10 * 1000 + 10 * 500);
  assert.equal(t.discountOnStock, 10 * 250, "the second product has no discount");
  assert.equal(t.preordersReserved, 40);
  assert.equal(t.preorderRemaining, 60);
});

test("low and out-of-stock counts ignore pre-order rows", () => {
  const t = inventoryTotals([
    model({ variants: [
      { id: "a", name: "A", colorHex: "#000", sku: "A", availability: "in_stock",
        stockQty: 0, preorderTarget: 0, preorderReserved: 0 },
      { id: "b", name: "B", colorHex: "#000", sku: "B", availability: "in_stock",
        stockQty: 3, preorderTarget: 0, preorderReserved: 0 },
      { id: "c", name: "C", colorHex: "#000", sku: "C", availability: "preorder",
        stockQty: 0, preorderTarget: 10, preorderReserved: 1 },
    ] }),
  ]);
  assert.equal(t.outOfStock, 1, "the pre-order row is not 'out of stock'");
  assert.equal(t.lowStock, 1);
});
