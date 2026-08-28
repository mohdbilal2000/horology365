import "server-only";
import { query, queryOne } from "@/lib/db/client";
import {
  PRODUCT_COLUMNS,
  adminModelToInsertRow,
  adminModelToUpdateRow,
  computeDerivedFields,
  rowToAdminModel,
  type ProductRowForAdmin,
} from "@/lib/data/adminProducts";
import { ensureBrandExists } from "@/lib/data/adminBrands";
import { recordAudit } from "@/lib/data/adminAudit";
import type { AdminModel, Variant } from "@/lib/types";

/**
 * Every admin write against `products`, in one place.
 *
 * Two rules hold throughout and are the reason this module exists rather than
 * SQL scattered through route handlers:
 *
 *   - Nothing hard-deletes. Removal sets `deleted_at`; `restoreProduct` undoes
 *     it. There is no delete statement anywhere in this file.
 *   - Every change is audited with its before/after state.
 */

type Editable = Omit<AdminModel, "id" | "createdAt">;

/**
 * Shrinks a product before it goes into `admin_audit`'s before/after columns.
 *
 * Uploaded photos are stored as base64 data URLs on the product row itself
 * (see `src/app/api/product-image/[slug]/[index]/route.ts`), which can run to
 * hundreds of KB per photo. `admin_audit` is append-only and every edit writes
 * a fresh snapshot, so without this a product edited ten times would carry its
 * full photo set ten extra times over — the table (and every future backup
 * and DB migration) grows in proportion to edit count, not product count. The
 * audit only needs to show *that* a photo changed, not hold a duplicate copy
 * of it forever; the real photo stays exactly once, on the product row.
 */
function auditSnapshot(product: AdminModel | null): unknown {
  if (!product) return product;
  return {
    ...product,
    images: (product.images ?? []).map((url) =>
      url.startsWith("data:")
        ? `[uploaded photo, ${Math.ceil(url.length / 1024)} KB — omitted from audit log]`
        : url,
    ),
  };
}

/** Live products, newest first. */
export async function listAdminProducts(
  opts: { onlyDeleted?: boolean } = {},
): Promise<AdminModel[]> {
  const rows = await query<ProductRowForAdmin>(
    `select ${PRODUCT_COLUMNS}
       from products
      where deleted_at is ${opts.onlyDeleted ? "not null" : "null"}
      order by created_at desc`,
  );
  return rows.map(rowToAdminModel);
}

/** One live product. A removed product is restored before it can be edited. */
export async function getAdminProduct(id: string): Promise<AdminModel | null> {
  const row = await queryOne<ProductRowForAdmin>(
    `select ${PRODUCT_COLUMNS} from products where id = $1 and deleted_at is null`,
    [id],
  );
  return row ? rowToAdminModel(row) : null;
}

export async function createProduct(model: Editable): Promise<AdminModel> {
  await ensureBrandExists(model.brandSlug);
  const row = adminModelToInsertRow(model);

  const created = await queryOne<ProductRowForAdmin>(
    `insert into products
       (slug, title, description, brand_slug, category_slug, price, mrp,
        images, stock, is_preorder, drop_date, variants)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     returning ${PRODUCT_COLUMNS}`,
    [
      row.slug,
      row.title,
      row.description,
      row.brand_slug,
      row.category_slug,
      row.price,
      row.mrp,
      JSON.stringify(row.images),
      row.stock,
      row.is_preorder,
      row.drop_date,
      JSON.stringify(row.variants),
    ],
  );
  if (!created) throw new Error("Insert returned no row.");

  const product = rowToAdminModel(created);
  await recordAudit({
    action: "product.create",
    targetId: product.id,
    summary: `Added "${product.title}"`,
    after: auditSnapshot(product),
  });
  return product;
}

/** Full edit. The slug is left alone so the public product URL keeps working. */
export async function updateProduct(
  id: string,
  model: Editable,
): Promise<AdminModel | null> {
  await ensureBrandExists(model.brandSlug);

  const before = await getAdminProduct(id);
  const row = adminModelToUpdateRow(model);

  const updated = await queryOne<ProductRowForAdmin>(
    `update products
        set title = $2, description = $3, brand_slug = $4, category_slug = $5,
            price = $6, mrp = $7, images = $8, stock = $9, is_preorder = $10,
            drop_date = $11, variants = $12, updated_at = now()
      where id = $1 and deleted_at is null
      returning ${PRODUCT_COLUMNS}`,
    [
      id,
      row.title,
      row.description,
      row.brand_slug,
      row.category_slug,
      row.price,
      row.mrp,
      JSON.stringify(row.images),
      row.stock,
      row.is_preorder,
      row.drop_date,
      JSON.stringify(row.variants),
    ],
  );
  if (!updated) return null;

  const product = rowToAdminModel(updated);
  await recordAudit({
    action: "product.update",
    targetId: id,
    summary: `Updated "${product.title}"`,
    before: auditSnapshot(before),
    after: auditSnapshot(product),
  });
  return product;
}

/**
 * Changes one variant: nudge stock, set any figure outright, or move a
 * pre-order batch into delivery.
 *
 * Absolute `set` values exist so the owner can *correct* a number rather than
 * only nudge it. Stock counts drift against a real shelf, and a batch size or
 * reserved count entered wrongly at creation was previously impossible to fix
 * without deleting the product.
 */
export async function adjustVariant(
  id: string,
  variantId: string,
  change: {
    delta?: number;
    action?: "startDelivery";
    set?: {
      stockQty?: number;
      preorderTarget?: number;
      preorderReserved?: number;
      availability?: Variant["availability"];
    };
  },
): Promise<AdminModel | null> {
  const current = await queryOne<{ title: string; variants: Variant[] }>(
    "select title, variants from products where id = $1 and deleted_at is null",
    [id],
  );
  if (!current) return null;

  const previous = (current.variants ?? []).find((v) => v.id === variantId) ?? null;

  /** Never let a count go negative, whichever route set it. */
  const clamp = (n: number) => Math.max(0, Math.round(n));

  const variants: Variant[] = (current.variants ?? []).map((v) => {
    if (v.id !== variantId) return v;
    if (change.action === "startDelivery") {
      return { ...v, availability: "in_delivery" as const, stockQty: v.preorderReserved };
    }
    if (change.set) {
      const next = { ...v };
      if (typeof change.set.stockQty === "number") next.stockQty = clamp(change.set.stockQty);
      if (typeof change.set.preorderTarget === "number") {
        next.preorderTarget = clamp(change.set.preorderTarget);
      }
      if (typeof change.set.preorderReserved === "number") {
        next.preorderReserved = clamp(change.set.preorderReserved);
      }
      if (change.set.availability) next.availability = change.set.availability;
      return next;
    }
    if (typeof change.delta === "number") {
      return { ...v, stockQty: clamp(v.stockQty + change.delta) };
    }
    return v;
  });

  const { stock, isPreorder, dropDate } = computeDerivedFields(variants);
  const updated = await queryOne<ProductRowForAdmin>(
    `update products
        set variants = $2, stock = $3, is_preorder = $4, drop_date = $5,
            updated_at = now()
      where id = $1 and deleted_at is null
      returning ${PRODUCT_COLUMNS}`,
    [id, JSON.stringify(variants), stock, isPreorder, dropDate],
  );
  if (!updated) return null;

  const changed = variants.find((v) => v.id === variantId);
  await recordAudit({
    action: "product.stock",
    targetId: id,
    summary: describeVariantChange(current.title, changed?.name ?? variantId, previous, changed, change),
    before: previous,
    after: changed ?? null,
  });
  return rowToAdminModel(updated);
}

/**
 * Removes a product from the storefront — a SOFT delete.
 *
 * This is the whole guarantee: the row, and every image the owner uploaded with
 * it, is retained and restorable. There is no statement in this codebase that
 * deletes a product row, and a Postgres trigger refuses one anyway.
 */
export async function softDeleteProduct(id: string): Promise<AdminModel | null> {
  const removed = await queryOne<ProductRowForAdmin>(
    `update products
        set deleted_at = now(), updated_at = now()
      where id = $1 and deleted_at is null
      returning ${PRODUCT_COLUMNS}`,
    [id],
  );
  if (!removed) return null;

  const product = rowToAdminModel(removed);
  await recordAudit({
    action: "product.delete",
    targetId: id,
    summary: `Removed "${product.title}" from the storefront (kept in records)`,
    before: auditSnapshot(product),
    after: null,
  });
  return product;
}

/** Brings a removed product back, images and variants intact. */
export async function restoreProduct(id: string): Promise<AdminModel | null> {
  const restored = await queryOne<ProductRowForAdmin>(
    `update products
        set deleted_at = null, updated_at = now()
      where id = $1
      returning ${PRODUCT_COLUMNS}`,
    [id],
  );
  if (!restored) return null;

  const product = rowToAdminModel(restored);
  await recordAudit({
    action: "product.restore",
    targetId: id,
    summary: `Restored "${product.title}"`,
    after: auditSnapshot(product),
  });
  return product;
}

/** Human-readable summary of a variant change, for the audit log. */
function describeVariantChange(
  title: string,
  variantName: string,
  before: Variant | null,
  after: Variant | undefined,
  change: { delta?: number; action?: "startDelivery"; set?: Record<string, unknown> },
): string {
  const who = `${title} · ${variantName}`;
  if (change.action === "startDelivery") {
    return `${who}: ${before?.preorderReserved ?? 0} pre-orders moved to delivery`;
  }
  if (change.set && before && after) {
    const parts: string[] = [];
    if (before.stockQty !== after.stockQty) {
      parts.push(`stock ${before.stockQty} -> ${after.stockQty}`);
    }
    if (before.preorderTarget !== after.preorderTarget) {
      parts.push(`batch size ${before.preorderTarget} -> ${after.preorderTarget}`);
    }
    if (before.preorderReserved !== after.preorderReserved) {
      parts.push(`reserved ${before.preorderReserved} -> ${after.preorderReserved}`);
    }
    if (before.availability !== after.availability) {
      parts.push(`${before.availability} -> ${after.availability}`);
    }
    return `${who}: ${parts.length ? parts.join(", ") : "no change"}`;
  }
  const d = change.delta ?? 0;
  return `${who}: stock ${d > 0 ? "+" : ""}${d} -> ${after?.stockQty ?? "?"}`;
}
