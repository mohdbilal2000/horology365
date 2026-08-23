import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Append-only record of every admin change to the catalog.
 *
 * The rule this supports: an admin action is never destructive to history.
 * Removing a product sets `deleted_at` and writes a `product.delete` entry; the
 * row itself, and the images attached to it, stay. Every entry keeps the
 * before/after state so any change can be inspected — or reversed — later.
 *
 * Nothing in the app updates or deletes rows in this table, and a Postgres
 * trigger (supabase/migrations/20260823-product-data-safety.sql) rejects the
 * attempt even for the service role, so a bug cannot rewrite history.
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
 * is visible in the server logs instead.
 */
export async function recordAudit(
  supabase: SupabaseClient,
  input: RecordAuditInput,
): Promise<void> {
  const { error } = await supabase.from("admin_audit").insert({
    action: input.action,
    target_id: input.targetId,
    summary: input.summary,
    actor: input.actor ?? "admin",
    before: input.before ?? null,
    after: input.after ?? null,
  });

  if (error) {
    console.error(
      `[audit] failed to record ${input.action} on ${input.targetId}:`,
      error.message,
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
export async function listAudit(
  supabase: SupabaseClient,
  limit = 200,
): Promise<AuditEntry[]> {
  const { data, error } = await supabase
    .from("admin_audit")
    .select("*")
    .order("at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[audit] list failed:", error.message);
    return [];
  }
  return (data ?? []) as AuditEntry[];
}
