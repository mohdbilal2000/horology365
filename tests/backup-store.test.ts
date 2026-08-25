import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";

/**
 * The previous backup system returned 503 every night because no email key was
 * set, and nothing anywhere reported it: the shop ran for weeks with no copy of
 * its catalogue, which only surfaced when the database stopped answering.
 *
 * So these tests exercise the real upload and listing code against a stub Blob
 * API — not mocks of our own functions — and pin the rule that "no backup" is
 * reported as a failure rather than passing quietly.
 */

let server: Server;
let received: { pathname: string; body: string; auth?: string }[] = [];
let blobs: { pathname: string; uploadedAt: string; size: number }[] = [];

before(async () => {
  server = createServer((req, res) => {
    if (req.method === "PUT") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const pathname = decodeURI((req.url ?? "").slice(1));
        received.push({ pathname, body, auth: req.headers.authorization });
        blobs.push({ pathname, uploadedAt: new Date().toISOString(), size: body.length });
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ url: `https://blob.example/${pathname}` }));
      });
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ blobs }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  process.env.BLOB_API_BASE = `http://127.0.0.1:${port}`;
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";
});

after(() => server.close());

test("a backup is actually uploaded, with its contents intact", async () => {
  const { putBackup } = await import("@/lib/data/backupStore");
  received = [];
  const json = JSON.stringify({ version: 1, products: [{ slug: "a-watch" }] });
  const url = await putBackup("backups/horology365-backup-2026-08-25.json", json);

  assert.equal(received.length, 1, "the backup must reach the store");
  assert.equal(received[0]!.body, json, "the stored bytes must be the backup itself");
  assert.equal(received[0]!.auth, "Bearer test-token");
  assert.ok(url.includes("horology365-backup-2026-08-25.json"));
});

test("a store with no backups in it is reported as a failure, not as healthy", async () => {
  const { backupHealth } = await import("@/lib/data/backupStore");
  const h = backupHealth([]);
  assert.equal(h.ok, false);
  assert.match(h.detail, /no backup has ever been taken/i);
});

test("a backup older than a day is reported as a failure", async () => {
  const { backupHealth, STALE_AFTER_HOURS } = await import("@/lib/data/backupStore");
  const now = Date.parse("2026-08-25T12:00:00Z");
  const old = new Date(now - (STALE_AFTER_HOURS + 5) * 3_600_000).toISOString();
  const h = backupHealth([{ pathname: "backups/old.json", uploadedAt: old, size: 10 }], now);
  assert.equal(h.ok, false, "a missed nightly run must not read as healthy");
  assert.match(h.detail, /not running/i);
});

test("a fresh backup is reported as healthy", async () => {
  const { backupHealth } = await import("@/lib/data/backupStore");
  const now = Date.parse("2026-08-25T12:00:00Z");
  const recent = new Date(now - 2 * 3_600_000).toISOString();
  const h = backupHealth([{ pathname: "backups/new.json", uploadedAt: recent, size: 10 }], now);
  assert.equal(h.ok, true);
});

test("what was uploaded can be listed back", async () => {
  const { listBackups } = await import("@/lib/data/backupStore");
  const list = await listBackups();
  assert.ok(list.length >= 1, "an uploaded backup must be findable again");
  assert.ok(list[0]!.pathname.startsWith("backups/"));
});
