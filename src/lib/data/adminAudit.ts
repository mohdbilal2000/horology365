import "server-only";
import { query, isDatabaseConfigured } from "@/lib/db/client";

/**
 * Append-only record of every admin change to the catalog.
 *
 * The rule this supports: an admin action is never destructive to history.
 * Removing a product sets `deleted_at` and writes a `product.delete` entry; the
 * row itself, and the images attached to it, stay. Every entry keeps the
 * before/after state so any change can be inspected — or reversed — later.
 *
 * Nothing in the app updates or deletes rows in this table, and a Postgres
 * trigger (db/migrations/20260823-product-data-safety.sql) rejects the
 * attempt even for a superuser connection, so a bug cannot rewrite history.
 */

export type AuditAction =
  | "product.create"
  | "product.update"
  | "product.delete"
  | "product.restore"
  | "product.stock";

export interface RecordAuditInput {
  action: AuditAction;
  /** The product's id. */
  targetId: string;
  /** Human-readable summary shown in the admin audit log. */
  summary: string;
  actor?: string;
  before?: unknown;
  after?: unknown;
}

/**
 * Writes one audit entry. Deliberately never throws: failing to log must not
 * fail the admin action the owner just took. A failure is logged loudly so it
 * shows up in the server logs instead.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    await query(
      `insert into admin_audit (action, target_id, summary, actor, before, after)
       values ($1, $2, $3, $4, $5, $6)`,
      [
        input.action,
        input.targetId,
        input.summary,
        input.actor ?? "admin",
        input.before === undefined ? null : JSON.stringify(input.before),
        input.after === undefined ? null : JSON.stringify(input.after),
      ],
    );
  } catch (err) {
    console.error(
      `[audit] failed to record ${input.action} on ${input.targetId}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

export interface AuditEntry {
  id: string;
  at: string;
  action: string;
  target_id: string;
  summary: string;
  actor: string;
  before: unknown;
  after: unknown;
}

/** Newest entries first. */
export async function listAudit(limit = 200): Promise<AuditEntry[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const rows = await query<Omit<AuditEntry, "at"> & { at: string | Date }>(
      `select id, at, action, target_id, summary, actor, before, after
         from admin_audit
        order by at desc
        limit $1`,
      [limit],
    );
    return rows.map((r) => ({
      ...r,
      at: r.at instanceof Date ? r.at.toISOString() : r.at,
    }));
  } catch (err) {
    console.error("[audit] list failed:", err instanceof Error ? err.message : err);
    return [];
  }
}
