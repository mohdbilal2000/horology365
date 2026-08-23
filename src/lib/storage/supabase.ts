/**
 * A tiny PostgREST client for Supabase, built on `fetch`.
 *
 * We deliberately do not pull in `@supabase/supabase-js`: everything the server
 * needs here is four REST calls, and keeping the dependency out means the
 * order-writing path has no third-party code in it. See CODEBASE_LOCK.md.
 *
 * All calls use the service-role key and therefore MUST only ever run on the
 * server. Never import this module from a "use client" file.
 */

const REST_TIMEOUT_MS = 10_000;

export interface SupabaseConfig {
  url: string;
  serviceKey: string;
}

/**
 * Returns the Supabase config when both halves are present, else null.
 * A partially-configured project is treated as unconfigured rather than
 * failing at request time.
 */
export function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return { url, serviceKey };
}

export const isSupabaseConfigured = (): boolean => supabaseConfig() !== null;

async function request(
  cfg: SupabaseConfig,
  path: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REST_TIMEOUT_MS);
  try {
    return await fetch(`${cfg.url}/rest/v1/${path}`, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        apikey: cfg.serviceKey,
        Authorization: `Bearer ${cfg.serviceKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Inserts rows. `upsert` merges on the primary key instead of erroring. */
export async function insert<T>(
  table: string,
  rows: T | T[],
  opts: { upsert?: boolean } = {},
): Promise<void> {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase is not configured.");
  const res = await request(cfg, table, {
    method: "POST",
    headers: {
      Prefer: opts.upsert
        ? "resolution=merge-duplicates,return=minimal"
        : "return=minimal",
    },
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
  });
  if (!res.ok) {
    throw new Error(`Supabase insert into ${table} failed: ${res.status} ${await res.text()}`);
  }
}

/** Selects rows with a raw PostgREST query string, e.g. `id=eq.123&order=at.desc`. */
export async function select<T>(table: string, query = ""): Promise<T[]> {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase is not configured.");
  const res = await request(cfg, `${table}${query ? `?${query}` : ""}`, {
    method: "GET",
  });
  if (!res.ok) {
    throw new Error(`Supabase select from ${table} failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as T[];
}

/** Patches rows matched by a raw PostgREST filter. */
export async function update<T extends object>(
  table: string,
  filter: string,
  patch: T,
): Promise<void> {
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase is not configured.");
  const res = await request(cfg, `${table}?${filter}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(`Supabase update on ${table} failed: ${res.status} ${await res.text()}`);
  }
}
