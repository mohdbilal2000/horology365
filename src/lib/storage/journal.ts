import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Append-only, local-disk fallback used when Supabase is not configured.
 *
 * This exists so that "nothing is ever silently lost" holds even before the
 * database is wired up: every order and every admin change lands in a JSONL
 * file that can be replayed into Postgres later.
 *
 * Caveat, and it is an important one: on serverless hosts (Vercel) the only
 * writable directory is /tmp and it does NOT survive between deployments or
 * cold starts. On such hosts this is a best-effort breadcrumb, not durable
 * storage — configure Supabase for real durability. `journalIsDurable()`
 * reports which of the two you are getting so the admin UI can say so plainly.
 */

const DATA_DIR =
  process.env.DATA_DIR ??
  (process.env.VERCEL ? path.join("/tmp", "horology365-data") : path.join(process.cwd(), ".data"));

/** False on serverless hosts, where the journal directory is ephemeral. */
export function journalIsDurable(): boolean {
  return !process.env.VERCEL;
}

export function journalLocation(): string {
  return DATA_DIR;
}

function fileFor(collection: string): string {
  // Collection names are internal constants, but keep the path traversal-proof.
  const safe = collection.replace(/[^a-z0-9_-]/gi, "");
  return path.join(DATA_DIR, `${safe}.jsonl`);
}

/** Appends one record. Never throws — a failed journal must not fail an order. */
export async function append(collection: string, record: unknown): Promise<boolean> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.appendFile(fileFor(collection), `${JSON.stringify(record)}\n`, "utf8");
    return true;
  } catch (err) {
    console.error(`[journal] append to ${collection} failed:`, err);
    return false;
  }
}

/** Reads every record back, oldest first. Malformed lines are skipped, not fatal. */
export async function readAll<T>(collection: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(fileFor(collection), "utf8");
    const out: T[] = [];
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        out.push(JSON.parse(line) as T);
      } catch {
        // A truncated final line (crash mid-append) shouldn't hide the rest.
      }
    }
    return out;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    console.error(`[journal] read of ${collection} failed:`, err);
    return [];
  }
}
