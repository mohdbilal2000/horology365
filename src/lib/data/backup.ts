import "server-only";
import { randomUUID } from "node:crypto";
import { readCatalogue, restoreCatalogueEntries, type CatalogueEntry } from "@/lib/data/catalogue";
import { listOrders } from "@/lib/data/orders";
import { listAudit } from "@/lib/data/adminAudit";
import { recordAudit } from "@/lib/data/adminAudit";
import { uploadDataUrlImage } from "@/lib/data/images";
import type { Order } from "@/lib/types";

/**
 * Backup and restore.
 *
 * The delete/overwrite protections stop the store owner losing work *through
 * the app*. They cannot help if the store itself goes — a Blob store gets
 * disconnected, a Vercel project gets deleted, an account lapses. Only a copy
 * held somewhere else answers that, and a copy nobody has ever restored from
 * is not a backup.
 *
 * So: a snapshot is a plain JSON file the owner keeps, and restore is
 * insert-only — it puts back what is missing and never touches what is
 * there, so running it can't itself become the next way to lose data.
 */

export const BACKUP_VERSION = 2;

export interface Backup {
  version: number;
  takenAt: string;
  counts: { products: number; orders: number; auditEntries: number };
  products: CatalogueEntry[];
  orders: Order[];
  audit: unknown[];
}

/**
 * A complete snapshot. Soft-deleted products are included deliberately — the
 * point of a backup is everything on record, not just what's on the shop.
 */
export async function buildBackup(): Promise<Backup> {
  const [{ entries: products }, orders, audit] = await Promise.all([
    readCatalogue(),
    listOrders(10_000),
    listAudit(10_000),
  ]);

  return {
    version: BACKUP_VERSION,
    takenAt: new Date().toISOString(),
    counts: { products: products.length, orders: orders.length, auditEntries: audit.length },
    products,
    orders,
    audit,
  };
}

export interface RestoreResult {
  productsRestored: number;
  productsSkipped: number;
  ordersRestored: number;
  ordersSkipped: number;
  errors: string[];
}

/**
 * Rejects anything that isn't a backup this code (or its Postgres-era
 * predecessor) wrote. Version 1 (the old Postgres shape) is still accepted —
 * `restoreFromBackup` upgrades each row on the way in.
 */
export function isBackup(value: unknown): value is {
  version: number;
  products: Record<string, unknown>[];
  orders: Record<string, unknown>[];
} {
  if (!value || typeof value !== "object") return false;
  const b = value as { version?: unknown; products?: unknown; orders?: unknown };
  return (
    typeof b.version === "number" &&
    b.version <= BACKUP_VERSION &&
    Array.isArray(b.products) &&
    Array.isArray(b.orders)
  );
}

/**
 * Normalises one incoming product record — from this store's own backup
 * format, or from the old Postgres row shape — into a `CatalogueEntry`, and
 * moves any embedded `data:` photo to Blob storage on the way in.
 *
 * This is the one place a legacy base64 photo (from a backup taken before
 * the Blob migration) gets converted to a real, lightweight URL — so
 * restoring an old backup is also how the catalogue finishes moving off
 * embedded images, product by product, as each one is restored.
 */
export async function normaliseIncomingProduct(row: Record<string, unknown>): Promise<CatalogueEntry> {
  const rawImages = Array.isArray(row.images) ? row.images : [];
  const images = await Promise.all(
    rawImages.map(async (img) => {
      const url = typeof img === "string" ? img : String((img as { url?: unknown })?.url ?? "");
      const alt = typeof img === "object" && img ? String((img as { alt?: unknown }).alt ?? "") : "";
      if (url.startsWith("data:")) {
        try {
          const uploaded = await uploadDataUrlImage(url, String(row.slug ?? row.id ?? "product"));
          return { url: uploaded, alt };
        } catch (err) {
          console.error("[backup] could not move an embedded photo to Blob, keeping it inline:", err);
          return { url, alt };
        }
      }
      return { url, alt };
    }),
  );

  const now = new Date().toISOString();
  return {
    id: String(row.id ?? randomUUID()),
    slug: String(row.slug ?? ""),
    title: String(row.title ?? ""),
    description: String(row.description ?? ""),
    brand_slug: String(row.brand_slug ?? ""),
    category_slug: String(row.category_slug ?? ""),
    price: Number(row.price ?? 0),
    mrp: Number(row.mrp ?? 0),
    images: images.filter((i) => i.url),
    video_url: (row.video_url as string | null) ?? null,
    video_poster: (row.video_poster as string | null) ?? null,
    rating: Number(row.rating ?? 0),
    review_count: Number(row.review_count ?? 0),
    stock: Number(row.stock ?? 0),
    is_preorder: Boolean(row.is_preorder ?? false),
    drop_date: (row.drop_date as string | null) ?? null,
    is_featured: Boolean(row.is_featured ?? false),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    variants: Array.isArray(row.variants) ? (row.variants as CatalogueEntry["variants"]) : [],
    created_at: (row.created_at as string) ?? now,
    updated_at: (row.updated_at as string) ?? now,
    deleted_at: (row.deleted_at as string | null) ?? null,
  };
}

/**
 * Puts back what's missing. INSERT-ONLY, by design: a product whose slug (or
 * order id) already exists is left exactly as it is. Restoring can therefore
 * never overwrite newer work — the mistake that caused the original loss.
 */
export async function restoreFromBackup(
  backup: { products: Record<string, unknown>[]; orders: Record<string, unknown>[] },
  actor = "admin",
): Promise<RestoreResult> {
  const result: RestoreResult = {
    productsRestored: 0,
    productsSkipped: 0,
    ordersRestored: 0,
    ordersSkipped: 0,
    errors: [],
  };

  try {
    const incoming = await Promise.all(backup.products.map(normaliseIncomingProduct));
    const { restored, skipped } = await restoreCatalogueEntries(incoming);
    result.productsRestored = restored;
    result.productsSkipped = skipped;
  } catch (err) {
    result.errors.push(`products: ${err instanceof Error ? err.message : String(err)}`);
  }

  const { createOrder, getOrderById } = await import("@/lib/data/orders");
  for (const row of backup.orders) {
    const id = String(row.id ?? "");
    if (!id) continue;
    try {
      const existing = await getOrderById(id);
      if (existing) {
        result.ordersSkipped += 1;
        continue;
      }
      const order: Order = {
        id,
        items: (row.items as Order["items"]) ?? [],
        details: (row.details as Order["details"]) ?? ({} as Order["details"]),
        subtotal: Number(row.subtotal ?? 0),
        shipping: Number(row.shipping ?? 0),
        total: Number(row.total ?? 0),
        status: (row.status as Order["status"]) ?? "pending",
        createdAt: (row.created_at as string) ?? (row.createdAt as string) ?? new Date().toISOString(),
      };
      const created = await createOrder(order);
      if (created.ok) result.ordersRestored += 1;
      else result.errors.push(`order ${id}: ${created.error}`);
    } catch (err) {
      result.errors.push(`order ${id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await recordAudit({
    action: "product.restore",
    targetId: "backup",
    summary:
      `Restored from a backup: ${result.productsRestored} product(s) and ` +
      `${result.ordersRestored} order(s) put back, ` +
      `${result.productsSkipped + result.ordersSkipped} already present and left untouched`,
    actor,
    after: result,
  });

  return result;
}
