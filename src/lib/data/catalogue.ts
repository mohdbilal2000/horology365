import "server-only";
import { randomUUID } from "node:crypto";
import {
  blobConfigured,
  blobUrl,
  getJSON,
  putJSON,
  sortableTimestamp,
  randomSuffix,
} from "@/lib/data/blobClient";
import {
  adminModelToInsertRow,
  adminModelToUpdateRow,
  computeDerivedFields,
  rowToAdminModel,
  type ProductRowForAdmin,
} from "@/lib/data/adminProducts";
import { recordAudit } from "@/lib/data/adminAudit";
import type { AdminModel, Product, Variant } from "@/lib/types";

/**
 * The product catalogue, stored in Vercel Blob instead of a database.
 *
 * Two kinds of object, and the whole safety model rests on never mixing them
 * up:
 *
 *   - `store/catalogue/history/<timestamp>-<rand>.json` — the FULL catalogue
 *     as it stood after one write. A new file every time. Never overwritten,
 *     never read except by an admin looking at history or a restore. This is
 *     the "nothing is ever deleted" guarantee made physical: even a bug that
 *     wrote a bad catalogue can't destroy the last good one, because the last
 *     good one is a different, untouched file.
 *   - `store/catalogue/latest.json` — a small pointer: which history file is
 *     current, plus its own copy of the entries for a fast read. This is the
 *     ONLY object this module ever overwrites, and it carries a `version`
 *     (the history file's own timestamp) used to detect a race between two
 *     concurrent admin writes — see `withCatalogue` below.
 *
 * No row is ever removed from the entries array. "Delete" sets `deletedAt`,
 * exactly like the Postgres version did with a column — the enforcement just
 * moved from a database trigger to this being the only function in the
 * codebase that is allowed to build the array that gets written.
 */

export interface CatalogueEntry {
  id: string;
  slug: string;
  title: string;
  description: string;
  brand_slug: string;
  category_slug: string;
  price: number;
  mrp: number;
  images: { url: string; alt: string }[];
  video_url: string | null;
  video_poster: string | null;
  rating: number;
  review_count: number;
  stock: number;
  is_preorder: boolean;
  drop_date: string | null;
  is_featured: boolean;
  tags: string[];
  variants: Variant[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const CATALOGUE_LATEST = "store/catalogue/latest.json";

interface CataloguePointer {
  version: string;
  updatedAt: string;
  entries: CatalogueEntry[];
}

/** Reads the current catalogue. Empty array if nothing has ever been saved. */
export async function readCatalogue(): Promise<{ version: string | null; entries: CatalogueEntry[] }> {
  if (!blobConfigured()) return { version: null, entries: [] };
  // Straight to the pointer's own URL. Nothing is listed to find it — see
  // blobUrl(): listing here is what exhausted the store's operation budget.
  const pointer = await getJSON<CataloguePointer>(blobUrl(CATALOGUE_LATEST));
  if (!pointer) return { version: null, entries: [] };
  return { version: pointer.version, entries: pointer.entries };
}

/**
 * Retries a read-modify-write against the catalogue when another admin write
 * lands in between — the only concurrency guard needed for a single admin's
 * traffic. `mutate` receives the current entries and returns the new array;
 * it may be called more than once if a race is detected.
 */
async function withCatalogue<T>(
  mutate: (entries: CatalogueEntry[]) => { entries: CatalogueEntry[]; result: T },
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const { version: expectedVersion, entries: current } = await readCatalogue();
    const { entries: next, result } = mutate(current);

    const version = sortableTimestamp();
    // Immutable history first — this write can never be lost even if the
    // pointer update below loses a race and has to retry.
    await putJSON(`store/catalogue/history/${version}-${randomSuffix()}.json`, next);

    // Detect a concurrent write that landed while we were computing `next`.
    const stillCurrent = await readCatalogue();
    if (stillCurrent.version !== expectedVersion) {
      continue; // someone else wrote in between — recompute against their result
    }

    await putJSON(
      CATALOGUE_LATEST,
      { version, updatedAt: new Date().toISOString(), entries: next } satisfies CataloguePointer,
      { overwrite: true },
    );
    return result;
  }
  throw new Error("Too many concurrent catalogue writes — please try again.");
}

function toRowForAdmin(e: CatalogueEntry): ProductRowForAdmin {
  return e;
}

/** Live products, newest first. */
export async function listAdminProducts(
  opts: { onlyDeleted?: boolean } = {},
): Promise<AdminModel[]> {
  const { entries } = await readCatalogue();
  return entries
    .filter((e) => (opts.onlyDeleted ? e.deleted_at !== null : e.deleted_at === null))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((e) => rowToAdminModel(toRowForAdmin(e)));
}

/** One live product. */
export async function getAdminProduct(id: string): Promise<AdminModel | null> {
  const { entries } = await readCatalogue();
  const e = entries.find((x) => x.id === id && x.deleted_at === null);
  return e ? rowToAdminModel(toRowForAdmin(e)) : null;
}

type Editable = Omit<AdminModel, "id" | "createdAt">;

export async function createProduct(model: Editable): Promise<AdminModel> {
  const row = adminModelToInsertRow(model);
  const now = new Date().toISOString();

  const entry: CatalogueEntry = {
    id: randomUUID(),
    slug: row.slug,
    title: row.title,
    description: row.description,
    brand_slug: row.brand_slug,
    category_slug: row.category_slug,
    price: row.price,
    mrp: row.mrp,
    images: row.images,
    video_url: null,
    video_poster: null,
    rating: 0,
    review_count: 0,
    stock: row.stock,
    is_preorder: row.is_preorder,
    drop_date: row.drop_date,
    is_featured: false,
    tags: [],
    variants: row.variants,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await withCatalogue((entries) => ({ entries: [...entries, entry], result: undefined }));

  const product = rowToAdminModel(toRowForAdmin(entry));
  await recordAudit({
    action: "product.create",
    targetId: product.id,
    summary: `Added "${product.title}"`,
    after: auditSnapshot(product),
  });
  return product;
}

/** Full edit. The slug is left alone so the public product URL keeps working. */
export async function updateProduct(id: string, model: Editable): Promise<AdminModel | null> {
  const row = adminModelToUpdateRow(model);
  const now = new Date().toISOString();
  let before: AdminModel | null = null;
  let after: CatalogueEntry | null = null;

  await withCatalogue((entries) => {
    const idx = entries.findIndex((e) => e.id === id && e.deleted_at === null);
    if (idx === -1) return { entries, result: undefined };
    before = rowToAdminModel(toRowForAdmin(entries[idx]!));
    const updated: CatalogueEntry = {
      ...entries[idx]!,
      title: row.title,
      description: row.description,
      brand_slug: row.brand_slug,
      category_slug: row.category_slug,
      price: row.price,
      mrp: row.mrp,
      images: row.images,
      stock: row.stock,
      is_preorder: row.is_preorder,
      drop_date: row.drop_date,
      variants: row.variants,
      updated_at: now,
    };
    after = updated;
    const next = [...entries];
    next[idx] = updated;
    return { entries: next, result: undefined };
  });

  if (!after) return null;
  const product = rowToAdminModel(toRowForAdmin(after));
  await recordAudit({
    action: "product.update",
    targetId: id,
    summary: `Updated "${product.title}"`,
    before: auditSnapshot(before),
    after: auditSnapshot(product),
  });
  return product;
}

/** Changes one variant: nudge stock, set a figure outright, or start delivery on a pre-order batch. */
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
  const now = new Date().toISOString();
  let title = "";
  let previous: Variant | null = null;
  let changed: Variant | undefined;
  let after: CatalogueEntry | null = null;

  const clamp = (n: number) => Math.max(0, Math.round(n));

  await withCatalogue((entries) => {
    const idx = entries.findIndex((e) => e.id === id && e.deleted_at === null);
    if (idx === -1) return { entries, result: undefined };
    const current = entries[idx]!;
    title = current.title;
    previous = current.variants.find((v) => v.id === variantId) ?? null;

    const variants: Variant[] = current.variants.map((v) => {
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

    changed = variants.find((v) => v.id === variantId);
    const { stock, isPreorder, dropDate } = computeDerivedFields(variants);
    const updated: CatalogueEntry = {
      ...current,
      variants,
      stock,
      is_preorder: isPreorder,
      drop_date: dropDate,
      updated_at: now,
    };
    after = updated;
    const next = [...entries];
    next[idx] = updated;
    return { entries: next, result: undefined };
  });

  if (!after) return null;
  await recordAudit({
    action: "product.stock",
    targetId: id,
    summary: describeVariantChange(title, changed?.name ?? variantId, previous, changed, change),
    before: previous,
    after: changed ?? null,
  });
  return rowToAdminModel(toRowForAdmin(after));
}

/**
 * Removes a product from the storefront — a SOFT delete.
 *
 * This is the whole guarantee: the entry, and every image the owner uploaded
 * with it, stays in the catalogue array and every history file that already
 * included it. There is no code path anywhere in this module that removes an
 * entry from the array.
 */
export async function softDeleteProduct(id: string): Promise<AdminModel | null> {
  const now = new Date().toISOString();
  let removed: CatalogueEntry | null = null;

  await withCatalogue((entries) => {
    const idx = entries.findIndex((e) => e.id === id && e.deleted_at === null);
    if (idx === -1) return { entries, result: undefined };
    const updated: CatalogueEntry = { ...entries[idx]!, deleted_at: now, updated_at: now };
    removed = updated;
    const next = [...entries];
    next[idx] = updated;
    return { entries: next, result: undefined };
  });

  if (!removed) return null;
  const product = rowToAdminModel(toRowForAdmin(removed));
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
  const now = new Date().toISOString();
  let restored: CatalogueEntry | null = null;

  await withCatalogue((entries) => {
    const idx = entries.findIndex((e) => e.id === id);
    if (idx === -1) return { entries, result: undefined };
    const updated: CatalogueEntry = { ...entries[idx]!, deleted_at: null, updated_at: now };
    restored = updated;
    const next = [...entries];
    next[idx] = updated;
    return { entries: next, result: undefined };
  });

  if (!restored) return null;
  const product = rowToAdminModel(toRowForAdmin(restored));
  await recordAudit({
    action: "product.restore",
    targetId: id,
    summary: `Restored "${product.title}"`,
    after: auditSnapshot(product),
  });
  return product;
}

/**
 * Puts back catalogue entries missing from `incoming` (matched by slug).
 * INSERT-ONLY: an entry whose slug already exists — live or removed — is left
 * exactly as it is. Used by /api/admin/restore. Returns how many were added.
 */
export async function restoreCatalogueEntries(
  incoming: CatalogueEntry[],
): Promise<{ restored: number; skipped: number }> {
  let restored = 0;
  let skipped = 0;
  await withCatalogue((entries) => {
    const knownSlugs = new Set(entries.map((e) => e.slug));
    const toAdd = incoming.filter((e) => !knownSlugs.has(e.slug));
    restored = toAdd.length;
    skipped = incoming.length - toAdd.length;
    return { entries: [...entries, ...toAdd], result: undefined };
  });
  return { restored, skipped };
}

/** Public storefront shape — every field the frontend's `Product` type needs. */
export function entryToProduct(e: CatalogueEntry): Product {
  const images = e.images.map((i) => ({ url: i.url, alt: i.alt || e.title }));
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    description: e.description,
    brandSlug: e.brand_slug,
    categorySlug: e.category_slug as Product["categorySlug"],
    price: e.price,
    mrp: e.mrp,
    images,
    videoUrl: e.video_url ?? undefined,
    videoPoster: e.video_poster ?? undefined,
    rating: e.rating,
    reviewCount: e.review_count,
    stock: e.stock,
    isPreorder: e.is_preorder,
    dropDate: e.drop_date ?? undefined,
    isFeatured: e.is_featured,
    tags: e.tags,
  };
}

/**
 * Shrinks a product before it goes into an audit entry.
 *
 * Uploaded photos are Blob URLs, not embedded bytes, so this mainly guards
 * against a future change re-embedding data URLs — but it costs nothing to
 * keep, and it means an audit entry never duplicates image bytes regardless
 * of how an image ends up stored.
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
    if (before.stockQty !== after.stockQty) parts.push(`stock ${before.stockQty} -> ${after.stockQty}`);
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
