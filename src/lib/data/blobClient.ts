import "server-only";

/**
 * Low-level Vercel Blob REST client — the one thing every store module below
 * (`catalogue.ts`, `orders.ts`, `adminAudit.ts`, `backupStore.ts`) is built on.
 *
 * Written against the plain REST API rather than the `@vercel/blob` SDK, for
 * the same reason the database used to be plain `pg`: a configurable base URL
 * means every write/list/read path here can be exercised end to end against a
 * local stub server in tests (see tests/blob-store.test.ts), not mocked.
 *
 * Every object this project writes is either:
 *   - immutable history — a new, unique pathname every time, never touched
 *     again — or
 *   - a small "latest" pointer at a fixed, well-known pathname, which is the
 *     only kind of object this client ever overwrites.
 * Nothing here ever deletes a blob. There is no delete function.
 */

const API_VERSION = "7";
const BASE = process.env.BLOB_API_BASE ?? "https://blob.vercel-storage.com";

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function auth(): Record<string, string> {
  return {
    authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    "x-api-version": API_VERSION,
  };
}

function requireConfigured(): void {
  if (!blobConfigured()) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set — there is nowhere to store this.");
  }
}

export interface PutResult {
  url: string;
  pathname: string;
}

/**
 * Writes bytes to a pathname.
 *
 * `overwrite: true` is only ever used for the small "latest" pointer files —
 * every other caller writes to a pathname that includes its own timestamp, so
 * "overwrite" never actually replaces anything real.
 */
export async function putBlob(
  pathname: string,
  body: string | Buffer,
  opts: { contentType: string; overwrite?: boolean },
): Promise<PutResult> {
  requireConfigured();
  const res = await fetch(`${BASE}/${encodeURI(pathname)}`, {
    method: "PUT",
    headers: {
      ...auth(),
      "content-type": opts.contentType,
      "x-vercel-blob-access": "private",
      "x-add-random-suffix": "0",
      "x-cache-control-max-age": opts.overwrite ? "0" : "31536000",
      ...(opts.overwrite ? { "x-allow-overwrite": "1" } : {}),
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Blob write failed for ${pathname} (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error(`Blob write for ${pathname} returned no URL.`);
  return { url: data.url, pathname };
}

export async function putJSON(
  pathname: string,
  value: unknown,
  opts: { overwrite?: boolean } = {},
): Promise<PutResult> {
  return putBlob(pathname, JSON.stringify(value), {
    contentType: "application/json",
    overwrite: opts.overwrite,
  });
}

/**
 * Fetches and parses a JSON blob by its URL. Never cached — always the true
 * current bytes. Private-store blobs require the same bearer token as every
 * other call here — there is no such thing as an anonymous read.
 */
export async function getJSON<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { cache: "no-store", headers: auth() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Blob read failed for ${url} (${res.status})`);
  return (await res.json()) as T;
}

export interface BlobEntry {
  pathname: string;
  url: string;
  uploadedAt: string;
  size: number;
}

/** Every blob under `prefix`, across as many pages as it takes. Not sorted. */
export async function listPrefix(prefix: string): Promise<BlobEntry[]> {
  if (!blobConfigured()) return [];
  const out: BlobEntry[] = [];
  let cursor: string | undefined;
  for (;;) {
    const url = new URL(`${BASE}/`);
    url.searchParams.set("prefix", prefix);
    url.searchParams.set("limit", "1000");
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url.toString(), { headers: auth() });
    if (!res.ok) throw new Error(`Blob list failed for ${prefix} (${res.status}): ${await res.text()}`);
    const body = (await res.json()) as {
      blobs?: { pathname: string; url: string; uploadedAt: string; size: number }[];
      cursor?: string;
      hasMore?: boolean;
    };
    out.push(...(body.blobs ?? []));
    if (!body.hasMore || !body.cursor) break;
    cursor = body.cursor;
  }
  return out;
}

/** The single blob at an exact pathname, or null if it doesn't exist yet. */
export async function findExact(pathname: string): Promise<BlobEntry | null> {
  const matches = await listPrefix(pathname);
  return matches.find((b) => b.pathname === pathname) ?? null;
}

/**
 * Sortable timestamp for a pathname segment: fixed-width and colon/dot-free,
 * so pathnames under the same prefix sort lexicographically in upload order —
 * "newest" is always "list, then take the last one alphabetically."
 */
export function sortableTimestamp(d = new Date()): string {
  return d.toISOString().replace(/[:.]/g, "-");
}

export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}
