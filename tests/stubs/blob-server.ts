import { createServer, type Server } from "node:http";

/**
 * A real HTTP server standing in for the Vercel Blob REST API — PUT, GET by
 * URL, and the list endpoint — so tests exercise the actual read-modify-write
 * code in blobClient.ts/catalogue.ts/orders.ts, not a mock of it. Mirrors the
 * pattern tests/backup-store.test.ts already uses for backupStore.ts.
 */

interface StoredBlob {
  pathname: string;
  url: string;
  uploadedAt: string;
  size: number;
  contentType: string;
  body: Buffer;
}

export interface BlobStub {
  server: Server;
  base: string;
  blobs: Map<string, StoredBlob>;
  reset(): void;
}

export async function startBlobStub(): Promise<BlobStub> {
  const blobs = new Map<string, StoredBlob>();

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "PUT") {
      const pathname = decodeURI(url.pathname.slice(1));
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const body = Buffer.concat(chunks);
        const publicUrl = `${base}/${encodeURI(pathname)}`;
        blobs.set(pathname, {
          pathname,
          url: publicUrl,
          uploadedAt: new Date().toISOString(),
          size: body.length,
          contentType: req.headers["content-type"] ?? "application/octet-stream",
          body,
        });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ url: publicUrl }));
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/") {
      const prefix = url.searchParams.get("prefix") ?? "";
      const matches = [...blobs.values()].filter((b) => b.pathname.startsWith(prefix));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          blobs: matches.map((b) => ({
            pathname: b.pathname,
            url: b.url,
            uploadedAt: b.uploadedAt,
            size: b.size,
          })),
          hasMore: false,
        }),
      );
      return;
    }

    // GET of a specific blob's public URL — the pathname is everything after the host.
    const pathname = decodeURI(url.pathname.slice(1));
    const found = blobs.get(pathname);
    if (req.method === "GET" && found) {
      res.writeHead(200, { "content-type": found.contentType });
      res.end(found.body);
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  const base = `http://127.0.0.1:${port}`;

  process.env.BLOB_API_BASE = base;
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";

  return {
    server,
    base,
    blobs,
    reset: () => blobs.clear(),
  };
}
