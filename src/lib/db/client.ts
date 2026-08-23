import "server-only";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

/**
 * Postgres connection.
 *
 * The app talks to Postgres over the standard wire protocol rather than any
 * vendor SDK, so the database is a connection string away from being moved:
 * Supabase, Neon, Railway, RDS or a machine you own all work unchanged. The
 * schema and its migrations live in this repo, which is where the real control
 * is — you are never locked into a provider.
 *
 * Serverless note: every warm lambda holds its own pool, so `max` is
 * deliberately tiny. Postgres has a hard connection ceiling (Supabase's small
 * instances allow ~60) and a burst of traffic across many lambdas will exhaust
 * it long before the database is actually busy. Point DATABASE_URL at a pooler
 * (PgBouncer in transaction mode — Supabase and Neon both provide one) in
 * production. See DATABASE.md.
 */

/**
 * The connection string, under whichever name the host injected it.
 *
 * Providers disagree: Neon and most others set DATABASE_URL, while Vercel's own
 * Postgres integration sets POSTGRES_URL. Accepting both means clicking
 * "Create Database" in the Vercel dashboard just works, with nothing to copy by
 * hand — one less step to get wrong.
 *
 * Pooled URLs come first deliberately: the non-pooled variants open a direct
 * connection per serverless instance and will exhaust Postgres under load.
 */
const connectionString =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  undefined;

/** True when a database is configured. Everything degrades gracefully if not. */
export function isDatabaseConfigured(): boolean {
  return Boolean(connectionString);
}

/**
 * Whether to verify the server certificate.
 *
 * Managed providers issue certificates from roots Node doesn't always carry, so
 * `DATABASE_SSL=no-verify` encrypts without verifying — the common setting for
 * Supabase/Neon/Heroku. `DATABASE_SSL=disable` turns TLS off entirely and is
 * only appropriate for a database on localhost.
 */
function sslConfig(): false | { rejectUnauthorized: boolean } {
  const mode = process.env.DATABASE_SSL;
  if (mode === "disable") return false;
  if (mode === "require") return { rejectUnauthorized: true };
  if (mode === "no-verify") return { rejectUnauthorized: false };
  // Default: TLS for remote hosts, off for a local one.
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString ?? "");
  return isLocal ? false : { rejectUnauthorized: false };
}

let pool: Pool | null | undefined;

function getPool(): Pool | null {
  if (pool !== undefined) return pool;
  if (!connectionString) {
    pool = null;
    return pool;
  }

  pool = new Pool({
    connectionString,
    ssl: sslConfig(),
    // Keep the per-instance footprint small; see the serverless note above.
    max: Number(process.env.DATABASE_POOL_MAX ?? 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // Never let one wedged query hold a request open indefinitely.
    statement_timeout: 15_000,
  });

  // A pool that emits 'error' with no listener would crash the process. An idle
  // client dropped by the server is normal and recoverable.
  pool.on("error", (err) => {
    console.error("[db] idle client error:", err.message);
  });

  return pool;
}

/**
 * Runs a parameterised query. Always pass values as `params` — never build SQL
 * by concatenation, or an order id becomes an injection point.
 */
export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const p = getPool();
  if (!p) throw new Error("DATABASE_URL is not configured.");
  const result = await p.query<T>(text, params);
  return result.rows;
}

/**
 * Runs a multi-statement SQL script (no parameters, simple query protocol).
 *
 * Separate from query() because node-postgres only allows several statements in
 * one call when no parameter array is passed. Used solely for the idempotent
 * setup script; everything that touches user data goes through the
 * parameterised helpers.
 */
export async function runScript(sql: string): Promise<void> {
  const p = getPool();
  if (!p) throw new Error("DATABASE_URL is not configured.");
  await p.query(sql);
}

/** Returns the first row, or null. */
export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Runs `fn` inside a transaction, rolling back if it throws.
 * Used where several writes have to land together or not at all.
 */
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const p = getPool();
  if (!p) throw new Error("DATABASE_URL is not configured.");
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Closes the pool. For scripts and tests; the app never needs it. */
export async function closePool(): Promise<void> {
  if (pool) await pool.end();
  pool = undefined;
}
