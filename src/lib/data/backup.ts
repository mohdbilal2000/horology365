import "server-only";
import { query } from "@/lib/db/client";
import { recordAudit } from "@/lib/data/adminAudit";

/**
 * Backup and restore.
 *
 * The delete/overwrite protections stop the store owner losing work *through
 * the app*. They cannot help if the database itself goes — the project is
 * deleted, the account lapses, or someone runs one bad command with the
 * password. Only a copy held somewhere else answers that, and a copy nobody has
 * ever restored from is not a backup.
 *
 * So: a snapshot is a plain JSON file the owner keeps, and restore is
 * insert-only — it puts back what is missing and never touches what is there,
 * so running it can't itself become the next way to lose data.
 */

export const BACKUP_VERSION = 1;

export interface Backup {
  version: number;
  takenAt: string;
  counts: { products: number; orders: number; auditEntries: number };
  products: Record<string, unknown>[];
  orders: Record<string, unknown>[];
  audit: Record<string, unknown>[];
}

/**
 * A complete snapshot. Soft-deleted products are included deliberately — the
 * point of a backup is everything on record, not just what's on the shop.
 */
export async function buildBackup(): Promise<Backup> {
  const [products, orders, audit] = await Promise.all([
    query<Record<string, unknown>>("select * from products order by created_at"),
    query<Record<string, unknown>>("select * from orders order by created_at"),
    query<Record<string, unknown>>("select * from admin_audit order by at"),
  ]);

  return {
    version: BACKUP_VERSION,
    takenAt: new Date().toISOString(),
    counts: {
      products: products.length,
      orders: orders.length,
      auditEntries: audit.length,
    },
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

/** Rejects anything that isn't a backup this code wrote. */
export function isBackup(value: unknown): value is Backup {
  if (!value || typeof value !== "object") return false;
  const b = value as Partial<Backup>;
  return (
    typeof b.version === "number" &&
    b.version <= BACKUP_VERSION &&
    Array.isArray(b.products) &&
    Array.isArray(b.orders)
  );
}

const PRODUCT_COLS = [
  "slug", "title", "description", "brand_slug", "category_slug", "price", "mrp",
  "images", "video_url", "video_poster", "rating", "review_count", "stock",
  "is_preorder", "drop_date", "is_featured", "tags", "variants", "deleted_at",
] as const;

const JSON_COLS = new Set(["images", "variants", "items", "details"]);

function valuesFor(row: Record<string, unknown>, cols: readonly string[]): unknown[] {
  return cols.map((c) => {
    const v = row[c];
    if (v === undefined) return null;
    // jsonb columns must go back as JSON text, not as a JS object.
    return JSON_COLS.has(c) && v !== null ? JSON.stringify(v) : v;
  });
}

/**
 * Puts back what's missing. INSERT-ONLY, by design: a row whose slug (or order
 * id) already exists is left exactly as it is. Restoring can therefore never
 * overwrite newer work — the mistake that caused the original loss.
 */
export async function restoreFromBackup(
  backup: Backup,
  actor = "admin",
): Promise<RestoreResult> {
  const result: RestoreResult = {
    productsRestored: 0,
    productsSkipped: 0,
    ordersRestored: 0,
    ordersSkipped: 0,
    errors: [],
  };

  // Brands first, or a product's foreign key has nothing to point at.
  const brandSlugs = [
    ...new Set(backup.products.map((p) => String(p.brand_slug ?? "")).filter(Boolean)),
  ];
  for (const slug of brandSlugs) {
    const name = slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    await query(
      `insert into brands (slug, name, is_active, sort_order)
       values ($1, $2, true, 999) on conflict (slug) do nothing`,
      [slug, name],
    ).catch((e) => result.errors.push(`brand ${slug}: ${e.message}`));
  }

  const cols = PRODUCT_COLS.join(", ");
  const params = PRODUCT_COLS.map((_, i) => `$${i + 1}`).join(", ");
  for (const row of backup.products) {
    try {
      const inserted = await query(
        `insert into products (${cols}) values (${params})
         on conflict (slug) do nothing returning slug`,
        valuesFor(row, PRODUCT_COLS),
      );
      if (inserted.length) result.productsRestored += 1;
      else result.productsSkipped += 1;
    } catch (err) {
      result.errors.push(
        `product ${String(row.slug)}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  const orderCols = [
    "id", "items", "details", "payment_method", "upi_reference",
    "subtotal", "shipping", "total", "status",
  ] as const;
  const oCols = orderCols.join(", ");
  const oParams = orderCols.map((_, i) => `$${i + 1}`).join(", ");
  for (const row of backup.orders) {
    try {
      const inserted = await query(
        `insert into orders (${oCols}) values (${oParams})
         on conflict (id) do nothing returning id`,
        valuesFor(row, orderCols),
      );
      if (inserted.length) result.ordersRestored += 1;
      else result.ordersSkipped += 1;
    } catch (err) {
      result.errors.push(
        `order ${String(row.id)}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  await recordAudit({
    action: "product.restore",
    targetId: "backup",
    summary:
      `Restored from a backup taken ${backup.takenAt}: ` +
      `${result.productsRestored} product(s) and ${result.ordersRestored} order(s) put back, ` +
      `${result.productsSkipped + result.ordersSkipped} already present and left untouched`,
    actor,
    after: result,
  });

  return result;
}
