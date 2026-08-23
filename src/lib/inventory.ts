import type { AdminModel, Variant } from "@/lib/types";

/**
 * Inventory arithmetic, in one place and deliberately simple.
 *
 * Every number the admin sees comes from here, and each is a plain expression
 * of what it claims to be — the point is that the owner can check the maths
 * himself rather than trust a figure whose origin is invisible.
 */

/** Units physically on hand. Pre-order rows hold no stock yet, so they score 0. */
export function unitsInStock(model: AdminModel): number {
  return model.variants.reduce(
    (sum, v) => sum + (v.availability !== "preorder" ? v.stockQty : 0),
    0,
  );
}

/** Units customers have already reserved against a pre-order batch. */
export function preordersReserved(model: AdminModel): number {
  return model.variants.reduce((sum, v) => sum + v.preorderReserved, 0);
}

/** Total size of the pre-order batches being brought in. */
export function preorderTarget(model: AdminModel): number {
  return model.variants.reduce((sum, v) => sum + v.preorderTarget, 0);
}

/** Units still unsold in the open batches. */
export function preorderRemaining(model: AdminModel): number {
  return model.variants.reduce(
    (sum, v) => sum + Math.max(0, v.preorderTarget - v.preorderReserved),
    0,
  );
}

/** What the stock on hand is worth at the selling price. */
export function stockValue(model: AdminModel): number {
  return unitsInStock(model) * model.price;
}

/** What that same stock would total at MRP, before any discount. */
export function stockValueAtMrp(model: AdminModel): number {
  return unitsInStock(model) * model.mrp;
}

/** Rupees off per unit. Never negative, even if MRP was entered below price. */
export function discountPerUnit(model: AdminModel): number {
  return Math.max(0, model.mrp - model.price);
}

/** Discount as a whole percentage, or 0 when there is no MRP to discount from. */
export function discountPercent(model: AdminModel): number {
  if (model.mrp <= 0 || model.price >= model.mrp) return 0;
  return Math.round(((model.mrp - model.price) / model.mrp) * 100);
}

/** Money the customer saves across all stock on hand. */
export function totalDiscountOnStock(model: AdminModel): number {
  return unitsInStock(model) * discountPerUnit(model);
}

/** Expected takings if the open pre-order batches all sell. */
export function preorderValue(model: AdminModel): number {
  return preordersReserved(model) * model.price;
}

export function variantValue(model: AdminModel, variant: Variant): number {
  return variant.availability === "preorder"
    ? variant.preorderReserved * model.price
    : variant.stockQty * model.price;
}

export interface InventoryTotals {
  products: number;
  variants: number;
  unitsInStock: number;
  stockValue: number;
  stockValueAtMrp: number;
  discountOnStock: number;
  preordersReserved: number;
  preorderTarget: number;
  preorderRemaining: number;
  preorderValue: number;
  outOfStock: number;
  lowStock: number;
}

/** Rolls every product up into the figures shown on the dashboard. */
export function inventoryTotals(models: AdminModel[], lowStockAt = 5): InventoryTotals {
  const totals: InventoryTotals = {
    products: models.length,
    variants: 0,
    unitsInStock: 0,
    stockValue: 0,
    stockValueAtMrp: 0,
    discountOnStock: 0,
    preordersReserved: 0,
    preorderTarget: 0,
    preorderRemaining: 0,
    preorderValue: 0,
    outOfStock: 0,
    lowStock: 0,
  };

  for (const m of models) {
    totals.variants += m.variants.length;
    totals.unitsInStock += unitsInStock(m);
    totals.stockValue += stockValue(m);
    totals.stockValueAtMrp += stockValueAtMrp(m);
    totals.discountOnStock += totalDiscountOnStock(m);
    totals.preordersReserved += preordersReserved(m);
    totals.preorderTarget += preorderTarget(m);
    totals.preorderRemaining += preorderRemaining(m);
    totals.preorderValue += preorderValue(m);

    for (const v of m.variants) {
      if (v.availability === "preorder") continue;
      if (v.stockQty <= 0) totals.outOfStock += 1;
      else if (v.stockQty <= lowStockAt) totals.lowStock += 1;
    }
  }
  return totals;
}
