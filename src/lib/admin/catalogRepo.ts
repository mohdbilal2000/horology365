import { insert, select, isSupabaseConfigured } from "@/lib/storage/supabase";
import { append, readAll } from "@/lib/storage/journal";
import { recordAudit } from "./audit";
import type { AdminModel } from "@/lib/types";

/**
 * Server-side store for the admin catalog (Brand -> Model -> Variant).
 *
 * Two guarantees hold here, and they are the whole point of this module:
 *
 *  1. Admin edits survive the browser. The previous implementation kept the
 *     catalog in localStorage only, so clearing site data, switching device or
 *     opening the admin in a different browser lost every change. Writes now go
 *     to the server; the browser store is only a cache.
 *
 *  2. Nothing is ever hard-deleted. "Remove" sets `deleted_at`. The row, and
 *     every prior version of it, stays queryable forever, and each change is
 *     mirrored into the append-only audit trail.
 */

const TABLE = "admin_models";

export interface StoredModel extends AdminModel {
  /** Set when the model has been removed from the storefront. Never unset by delete. */
  deletedAt?: string | null;
  updatedAt?: string;
}

interface ModelRow {
  id: string;
  updated_at: string;
  deleted_at: string | null;
  payload: StoredModel;
}

function toRow(model: StoredModel): ModelRow {
  return {
    id: model.id,
    updated_at: model.updatedAt ?? new Date().toISOString(),
    deleted_at: model.deletedAt ?? null,
    payload: model,
  };
}

/** True when edits land somewhere that survives a redeploy. */
export function persistenceIsDurable(): boolean {
  return isSupabaseConfigured();
}

/**
 * All models. Soft-deleted ones are excluded unless asked for, so the
 * storefront and the default admin view never show removed products.
 */
export async function listModels(
  opts: { includeDeleted?: boolean } = {},
): Promise<StoredModel[]> {
  let models: StoredModel[] = [];

  if (isSupabaseConfigured()) {
    try {
      const rows = await select<ModelRow>(
        TABLE,
        "select=payload&order=updated_at.desc",
      );
      models = rows.map((r) => r.payload);
    } catch (err) {
      console.error("[catalog] Supabase list failed, falling back to journal:", err);
      models = await modelsFromJournal();
    }
  } else {
    models = await modelsFromJournal();
  }

  return opts.includeDeleted ? models : models.filter((m) => !m.deletedAt);
}

/** Replays the journal, collapsing to the newest version of each model id. */
async function modelsFromJournal(): Promise<StoredModel[]> {
  const rows = await readAll<ModelRow>(TABLE);
  const latest = new Map<string, StoredModel>();
  for (const row of rows) {
    if (row?.id) latest.set(row.id, row.payload);
  }
  return [...latest.values()].sort((a, b) =>
    (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt),
  );
}

async function findModel(id: string): Promise<StoredModel | null> {
  const all = await listModels({ includeDeleted: true });
  return all.find((m) => m.id === id) ?? null;
}

async function writeModel(model: StoredModel): Promise<void> {
  const row = toRow(model);
  await append(TABLE, row);
  if (isSupabaseConfigured()) {
    await insert(TABLE, row, { upsert: true });
  }
}

/** Creates or replaces a model, recording the change in the audit trail. */
export async function saveModel(
  model: AdminModel,
  actor: string,
): Promise<StoredModel> {
  const existing = await findModel(model.id);
  const next: StoredModel = {
    ...model,
    // A save never resurrects a deleted model implicitly; use restoreModel.
    deletedAt: existing?.deletedAt ?? null,
    updatedAt: new Date().toISOString(),
  };
  await writeModel(next);
  await recordAudit({
    action: existing ? "model.update" : "model.create",
    targetId: model.id,
    summary: existing ? `Updated "${model.title}"` : `Added "${model.title}"`,
    actor,
    before: existing,
    after: next,
  });
  return next;
}

/**
 * Soft-deletes a model. The row is retained with `deletedAt` set so the record
 * — and its audit history — remains available indefinitely.
 */
export async function softDeleteModel(
  id: string,
  actor: string,
): Promise<StoredModel | null> {
  const existing = await findModel(id);
  if (!existing || existing.deletedAt) return existing;

  const next: StoredModel = {
    ...existing,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await writeModel(next);
  await recordAudit({
    action: "model.delete",
    targetId: id,
    summary: `Removed "${existing.title}" from the storefront (kept in records)`,
    actor,
    before: existing,
    after: next,
  });
  return next;
}

/** Brings a soft-deleted model back. */
export async function restoreModel(
  id: string,
  actor: string,
): Promise<StoredModel | null> {
  const existing = await findModel(id);
  if (!existing || !existing.deletedAt) return existing;

  const next: StoredModel = {
    ...existing,
    deletedAt: null,
    updatedAt: new Date().toISOString(),
  };
  await writeModel(next);
  await recordAudit({
    action: "model.restore",
    targetId: id,
    summary: `Restored "${existing.title}"`,
    actor,
    before: existing,
    after: next,
  });
  return next;
}

/** Applies a stock delta to one variant and audits it. */
export async function adjustVariantStock(
  modelId: string,
  variantId: string,
  delta: number,
  actor: string,
): Promise<StoredModel | null> {
  const existing = await findModel(modelId);
  if (!existing) return null;

  const variant = existing.variants.find((v) => v.id === variantId);
  if (!variant) return existing;

  const nextQty = Math.max(0, variant.stockQty + delta);
  const next: StoredModel = {
    ...existing,
    updatedAt: new Date().toISOString(),
    variants: existing.variants.map((v) =>
      v.id === variantId ? { ...v, stockQty: nextQty } : v,
    ),
  };
  await writeModel(next);
  await recordAudit({
    action: "stock.adjust",
    targetId: modelId,
    summary: `${existing.title} · ${variant.name}: ${variant.stockQty} -> ${nextQty}`,
    actor,
    before: { stockQty: variant.stockQty },
    after: { stockQty: nextQty },
  });
  return next;
}

/** Moves a pre-order batch into "in delivery" and audits it. */
export async function startVariantDelivery(
  modelId: string,
  variantId: string,
  actor: string,
): Promise<StoredModel | null> {
  const existing = await findModel(modelId);
  if (!existing) return null;

  const variant = existing.variants.find((v) => v.id === variantId);
  if (!variant) return existing;

  const next: StoredModel = {
    ...existing,
    updatedAt: new Date().toISOString(),
    variants: existing.variants.map((v) =>
      v.id === variantId
        ? { ...v, availability: "in_delivery" as const, stockQty: v.preorderReserved }
        : v,
    ),
  };
  await writeModel(next);
  await recordAudit({
    action: "variant.delivery",
    targetId: modelId,
    summary: `${existing.title} · ${variant.name}: ${variant.preorderReserved} pre-orders moved to delivery`,
    actor,
    before: { availability: variant.availability, stockQty: variant.stockQty },
    after: { availability: "in_delivery", stockQty: variant.preorderReserved },
  });
  return next;
}
