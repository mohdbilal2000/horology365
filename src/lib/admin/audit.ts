import { insert, select, isSupabaseConfigured } from "@/lib/storage/supabase";
import { append, readAll } from "@/lib/storage/journal";
import { randomUUID } from "node:crypto";

/**
 * Append-only audit trail for admin changes.
 *
 * The rule this enforces: an admin action is never destructive to history.
 * Removing a product writes a `model.delete` entry and flips a `deleted_at`
 * flag; it does not remove the row. Every entry keeps the before/after state,
 * so any change can be inspected — or reversed — later.
 *
 * Nothing in the app is allowed to UPDATE or DELETE rows in this collection;
 * the Postgres policies in supabase/schema.sql enforce that at the database
 * level too, so a bug in the app cannot rewrite history.
 */

const TABLE = "admin_audit";

export type AuditAction =
  | "model.create"
  | "model.update"
  | "model.delete"
  | "model.restore"
  | "stock.adjust"
  | "variant.delivery";

export interface AuditEntry {
  id: string;
  at: string;
  action: AuditAction;
  /** Which model the change applied to. */
  target_id: string;
  /** Human-readable summary shown in the admin audit log. */
  summary: string;
  /** Who did it. The shared admin gate has one identity today. */
  actor: string;
  before: unknown;
  after: unknown;
}

export interface RecordAuditInput {
  action: AuditAction;
  targetId: string;
  summary: string;
  actor?: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Writes one audit entry to every configured sink. Best-effort by design —
 * losing an audit line must not block the admin action itself — but it always
 * reports whether the entry became durable.
 */
export async function recordAudit(
  input: RecordAuditInput,
): Promise<{ durable: boolean; journaled: boolean }> {
  const entry: AuditEntry = {
    id: randomUUID(),
    at: new Date().toISOString(),
    action: input.action,
    target_id: input.targetId,
    summary: input.summary,
    actor: input.actor ?? "admin",
    before: input.before ?? null,
    after: input.after ?? null,
  };

  const journaled = await append(TABLE, entry);

  if (!isSupabaseConfigured()) return { durable: false, journaled };
  try {
    await insert(TABLE, entry);
    return { durable: true, journaled };
  } catch (err) {
    console.error("[audit] Supabase write failed:", err);
    return { durable: false, journaled };
  }
}

/** Newest entries first. */
export async function listAudit(limit = 200): Promise<AuditEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      return await select<AuditEntry>(TABLE, `select=*&order=at.desc&limit=${limit}`);
    } catch (err) {
      console.error("[audit] Supabase list failed, falling back to journal:", err);
    }
  }
  const rows = await readAll<AuditEntry>(TABLE);
  return rows.reverse().slice(0, limit);
}
