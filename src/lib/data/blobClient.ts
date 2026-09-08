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

/**
 * Headers for the REST API host (`blob.vercel-storage.com`) — writes and
 * listings. `x-api-version` selects the API contract and belongs only here.
 */
function auth(): Record<string, string> {
  return {
    authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
    "x-api-version": API_VERSION,
  };
}

/**
 * Credentials for the *content* host, in the order the Blob SDK itself tries
 * them: the short-lived OIDC token Vercel injects into a Function when a store
 * is connected to the project, then the long-lived read-write token (the only
 * option when the code runs off Vercel, e.g. `npm run db:backup`).
 *
 * Named, never valued, in anything this module reports — see `readBlob`.
 */
function readCredentials(): { name: string; token: string }[] {
  const candidates = [
    { name: "VERCEL_OIDC_TOKEN", token: process.env.VERCEL_OIDC_TOKEN },
    { name: "BLOB_READ_WRITE_TOKEN", token: process.env.BLOB_READ_WRITE_TOKEN },
  ];
  return candidates.filter((c): c is { name: string; token: string } => Boolean(c.token));
}

/** Which credentials this deployment could read a private blob with. Names only. */
export function readCredentialNames(): string[] {
  return readCredentials().map((c) => c.name);
}

/**
 * The store id, from the environment or from the token that already carries it
 * (`vercel_blob_rw_<storeId>_<secret>`).
 */
function storeId(): string {
  const explicit = process.env.BLOB_STORE_ID;
  if (explicit) return explicit;
  const parts = (process.env.BLOB_READ_WRITE_TOKEN ?? "").split("_");
  const id = parts[3];
  if (!id) {
    throw new Error(
      "Could not work out the Blob store id from BLOB_READ_WRITE_TOKEN — set BLOB_STORE_ID.",
    );
  }
  return id;
}

/**
 * Where a blob lives, worked out rather than looked up.
 *
 * A blob's URL is fully determined by its store and its pathname, so reading a
 * file whose pathname is already known — the catalogue pointer, one order, one
 * product photo — needs no help from the API to find it.
 *
 * It used to ask anyway: every such read ran `findExact()`, which lists the
 * store and picks the one matching entry. Vercel counts `list()` as an
 * *Advanced Operation* (`put`, `copy`, `list`), and the Hobby plan includes
 * 2,000 of them per month — while a plain GET is a *Simple Operation*, with
 * 10,000 included and cache hits free. So every page render, every photo and
 * every health check spent from the small budget instead of the large one, and
 * eight days after the store was created the allowance ran out. Vercel then
 * refused all access to the store, the catalogue read started failing, and the
 * storefront fell back to its shipped snapshot — which looked, from the
 * outside, exactly like the owner's products having been deleted.
 *
 * Listing is still the right tool for enumerating things whose names are not
 * known ahead of time (`listOrders`, the audit trail, the health audit). It is
 * the wrong tool for fetching one file you can already name.
 */
export function blobUrl(pathname: string): string {
  const base =
    process.env.BLOB_CONTENT_BASE ?? `https://${storeId()}.private.blob.vercel-storage.com`;
  return `${base}/${encodeURI(pathname)}`;
}

/** The content host reads are addressed to. Reported by /api/health; no secret in it. */
export function contentHost(): string {
  try {
    return new URL(blobUrl("x")).host;
  } catch {
    return "unknown";
  }
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
 * Fetches one blob's bytes by its URL. Never cached — always the true current
 * bytes. Returns null for a blob that isn't there.
 *
 * A read goes to the *content* host (`<store>.private.blob.vercel-storage.com`),
 * not the REST API host above, and that host takes a bare bearer token and
 * nothing else — exactly the request Vercel documents:
 *
 *   curl https://<store>.private.blob.vercel-storage.com/<pathname> \
 *     -H "Authorization: Bearer $TOKEN"
 *
 * Two things this gets right that the previous one-liner did not, and both
 * matter because a failed read here is invisible to a shopper — the storefront
 * silently falls back to its shipped snapshot, so the owner's own products
 * appear to have vanished from the site while sitting safely in the store:
 *
 *   1. It sends *only* `authorization`. The API-only `x-api-version` header
 *      has no meaning on the content host.
 *   2. It tries OIDC before the static read-write token, and falls back to the
 *      other credential on a 401/403. On Vercel the SDK reads OIDC by default;
 *      a store connected to the project authorises reads that way, and a
 *      hand-pasted read-write token is not guaranteed to be accepted in its
 *      place.
 *
 * When every credential is refused, the thrown error carries the status *and*
 * the store's own explanation (`{"error":{"code":...}}`), which is what tells
 * an operator whether the token is wrong, the store is suspended, or the
 * pathname is genuinely off-limits. Credentials are named, never printed.
 */
async function readBlob(url: string): Promise<Response | null> {
  const credentials = readCredentials();
  if (credentials.length === 0) {
    throw new Error(
      "No Blob credential is set (BLOB_READ_WRITE_TOKEN or VERCEL_OIDC_TOKEN) — there is nothing to read with.",
    );
  }

  const refusals: string[] = [];
  for (const { name, token } of credentials) {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` },
    });
    if (res.status === 404) return null;
    if (res.ok) return res;
    // Only an authorisation refusal is worth re-trying with the other
    // credential; anything else is the store telling us something real.
    if (res.status !== 401 && res.status !== 403) {
      throw new Error(`Blob read failed for ${url} (${res.status}): ${await readDetail(res)}`);
    }
    refusals.push(`${name} → ${res.status} ${await readDetail(res)}`);
  }
  throw new Error(`Blob read refused for ${url} — ${refusals.join("; ")}`);
}

/** The store's own error text, trimmed to something an operator can read. */
async function readDetail(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  const detail = body.trim().slice(0, 300);
  return detail || "(no response body)";
}

/** Fetches and parses a JSON blob by its URL. Null if it isn't there. */
export async function getJSON<T>(url: string): Promise<T | null> {
  const res = await readBlob(url);
  if (!res) return null;
  return (await res.json()) as T;
}

/**
 * A blob's raw bytes and content type — the same authenticated read, for the
 * route that streams product photos to a shopper's browser.
 */
export async function getStream(
  url: string,
): Promise<{ body: ReadableStream<Uint8Array>; contentType: string } | null> {
  const res = await readBlob(url);
  if (!res?.body) return null;
  return { body: res.body, contentType: res.headers.get("content-type") ?? "image/jpeg" };
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
    // Next.js caches a plain fetch() indefinitely by default inside a static
    // page render — without this, an admin write would never appear on a
    // statically-rendered storefront page, only in routes exempt from that
    // cache (like /api/search). The pointer this lists is what tells every
    // read whether anything changed at all, so it can never be stale.
    const res = await fetch(url.toString(), { headers: auth(), cache: "no-store" });
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

// There is deliberately no "find one blob by pathname" helper here. It could
// only be a `list()` — an Advanced Operation — to discover a URL that
// `blobUrl()` already knows without asking. That helper existed, every read
// used it, and it is what drained the store's operation allowance. `listPrefix`
// remains for the callers that genuinely enumerate: orders, the audit trail,
// and the deep health audit.

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
