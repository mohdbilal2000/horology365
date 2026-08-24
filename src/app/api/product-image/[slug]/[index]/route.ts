import { query, isDatabaseConfigured } from "@/lib/db/client";

/**
 * Serves one product photo as a file.
 *
 * Uploaded photos are stored as data URLs inside the product row, which meant
 * every photo was pasted whole into the HTML: the home page reached 14 MB for
 * nine products, roughly 700 page views against a 10 GB monthly transfer
 * allowance, and minutes to load on mobile. The photos themselves are fine —
 * only the delivery was wrong.
 *
 * The storefront now points at this route and the browser fetches each photo
 * once, cached. Nothing is migrated or rewritten: the bytes still live in the
 * same row, and the admin, the backup and the restore all still read the
 * original data URL.
 *
 * Cached immutably. The URL carries the row's updated_at, so replacing a photo
 * produces a different URL rather than a stale image.
 */

interface RouteParams {
  params: Promise<{ slug: string; index: string }>;
}

interface Row {
  images: { url: string }[];
}

const ONE_YEAR = "public, max-age=31536000, immutable";

export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  if (!isDatabaseConfigured()) return new Response("Not found", { status: 404 });

  const { slug, index } = await params;
  const i = Number.parseInt(index, 10);
  if (!Number.isInteger(i) || i < 0) return new Response("Not found", { status: 404 });

  let rows: Row[];
  try {
    rows = await query<Row>(
      "select images from products where slug = $1 and deleted_at is null",
      [slug],
    );
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const raw = rows[0]?.images?.[i]?.url;
  if (typeof raw !== "string" || raw === "") return new Response("Not found", { status: 404 });

  // Ordinary links (Unsplash, a brand's own site) are not ours to serve.
  if (!raw.startsWith("data:")) return Response.redirect(raw, 302);

  const comma = raw.indexOf(",");
  const header = raw.slice(5, comma);
  if (comma === -1 || !header.endsWith(";base64")) {
    return new Response("Not found", { status: 404 });
  }
  const contentType = header.slice(0, -";base64".length) || "image/jpeg";

  let body: Buffer;
  try {
    body = Buffer.from(raw.slice(comma + 1), "base64");
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (body.length === 0) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(body), {
    headers: {
      "content-type": contentType,
      "content-length": String(body.length),
      "cache-control": ONE_YEAR,
    },
  });
}
