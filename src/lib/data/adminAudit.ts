import "server-only";
import { blobConfigured, listPrefix, getJSON, putJSON, sortableTimestamp, randomSuffix } from "@/lib/data/blobClient";

/**
 * Append-only record of every admin change to the catalogue.
 *
 * Each entry is its own Blob object, written once and never touched again —
 * "append-only" here isn't a rule the code has to remember to follow, it's
 * the only thing a new, uniquely-named file can do. There is no update or
 * delete path in this module at all.
 */

const AUDIT_PREFIX = "store/audit/";

export type AuditAction =
  | "product.create"
  | "product.update"
  | "product.delete"
  | "product.restore"
  | "product.stock";

export interface RecordAuditInput {
  action: AuditAction;
  targetId: string;
  summary: string;
  actor?: string;
  before?: unknown;
  after?: unknown;
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

/**
 * Writes one audit entry. Deliberately never throws: failing to log must not
 * fail the admin action the owner just took. A failure is logged loudly so it
 * shows up in the server logs instead.
 */
export async function recordAudit(input: RecordAuditInput): Promise<void> {
  if (!blobConfigured()) return;

  const id = `${sortableTimestamp()}-${randomSuffix()}`;
  const entry: AuditEntry = {
    id,
    at: new Date().toISOString(),
    action: input.action,
    target_id: input.targetId,
    summary: input.summary,
    actor: input.actor ?? "admin",
    before: input.before === undefined ? null : input.before,
    after: input.after === undefined ? null : input.after,
  };

  try {
    await putJSON(`${AUDIT_PREFIX}${id}.json`, entry);
  } catch (err) {
    console.error(
      `[audit] failed to record ${input.action} on ${input.targetId}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

/** Newest entries first. Pathnames are sortable timestamps, so a lexicographic sort is chronological. */
export async function listAudit(limit = 200): Promise<AuditEntry[]> {
  if (!blobConfigured()) return [];

  try {
    const blobs = await listPrefix(AUDIT_PREFIX);
    const newest = blobs.sort((a, b) => b.pathname.localeCompare(a.pathname)).slice(0, limit);
    const entries = await Promise.all(newest.map((b) => getJSON<AuditEntry>(b.url)));
    return entries.filter((e): e is AuditEntry => e !== null);
  } catch (err) {
    console.error("[audit] list failed:", err instanceof Error ? err.message : err);
    return [];
  }
}
