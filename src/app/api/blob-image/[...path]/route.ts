import { findExact, blobConfigured } from "@/lib/data/blobClient";

/**
 * Serves one product photo to a shopper's browser.
 *
 * The Blob store is private — it also holds orders, which carry a
 * customer's name, phone number and address, and those must never be
 * fetchable by guessing or leaking a URL. A private object can't be loaded
 * directly by an `<img>` tag (there's no way to attach a bearer token to
 * that request), so this route does it server-side instead: look up the
 * real Blob URL for this pathname, fetch it with the token, stream the
 * bytes back. Public route, deliberately — these are the storefront's own
 * product photos, meant to be visible to any shopper.
 *
 * Pathnames are content-addressed and never reused (see images.ts) — the
 * exact same URL always serves the exact same bytes, so this is safe to
 * cache forever.
 */
export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ path: string[] }>;
}

export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  if (!blobConfigured()) return new Response("Not found", { status: 404 });

  const { path } = await params;
  const pathname = path.join("/");
  // Only ever serve what images.ts itself uploads — nothing else in the store.
  if (!pathname.startsWith("store/images/")) {
    return new Response("Not found", { status: 404 });
  }

  const blob = await findExact(pathname);
  if (!blob) return new Response("Not found", { status: 404 });

  const upstream = await fetch(blob.url, {
    headers: { authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` },
  });
  if (!upstream.ok || !upstream.body) return new Response("Not found", { status: 404 });

  return new Response(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
