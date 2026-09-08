import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server, type IncomingHttpHeaders } from "node:http";
import { getJSON, getStream, readCredentialNames } from "@/lib/data/blobClient";

/**
 * How a private blob is *read*.
 *
 * Writes and listings go to the Blob REST API host; reads go to the store's
 * own content host, which is a different service with a different contract. A
 * read that is shaped like an API call gets a 403 — and a 403 here is silent
 * where it matters most: `getAllProducts` catches it and serves the shipped
 * snapshot, so the storefront looks fine while every product the owner added
 * is missing from it. That is exactly what production did, so the request
 * shape is pinned here rather than left to a comment.
 */

let server: Server;
let base: string;
let seen: IncomingHttpHeaders[] = [];
/** Which bearer tokens this stub store accepts. */
let accepted = new Set<string>();

before(async () => {
  server = createServer((req, res) => {
    seen.push(req.headers);
    const token = (req.headers.authorization ?? "").replace(/^Bearer /, "");
    if (req.url === "/missing.json") {
      res.writeHead(404).end("not found");
      return;
    }
    if (!accepted.has(token)) {
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { code: "forbidden", message: "Access denied" } }));
      return;
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ hello: "world" }));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as { port: number };
  base = `http://127.0.0.1:${port}`;
});

after(() => server.close());

/** The headers of the nth request this stub store received. */
function requestHeaders(index: number): IncomingHttpHeaders {
  const headers = seen[index];
  assert.ok(headers, `expected the store to have received request #${index + 1}`);
  return headers;
}

beforeEach(() => {
  seen = [];
  accepted = new Set();
  delete process.env.VERCEL_OIDC_TOKEN;
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

test("a read sends only the bearer token — never the API-only x-api-version header", async () => {
  process.env.BLOB_READ_WRITE_TOKEN = "rw-token";
  accepted.add("rw-token");

  assert.deepEqual(await getJSON(`${base}/latest.json`), { hello: "world" });
  assert.equal(seen.length, 1);
  assert.equal(requestHeaders(0).authorization, "Bearer rw-token");
  assert.equal(requestHeaders(0)["x-api-version"], undefined);
});

test("OIDC is tried first, and a refusal falls back to the read-write token", async () => {
  process.env.VERCEL_OIDC_TOKEN = "oidc-token";
  process.env.BLOB_READ_WRITE_TOKEN = "rw-token";
  accepted.add("rw-token"); // OIDC is rejected by this store

  assert.deepEqual(await getJSON(`${base}/latest.json`), { hello: "world" });
  assert.deepEqual(
    seen.map((h) => h.authorization),
    ["Bearer oidc-token", "Bearer rw-token"],
  );
});

test("the store's own explanation survives into the error, credentials named but never printed", async () => {
  process.env.BLOB_READ_WRITE_TOKEN = "wrong-token";

  await assert.rejects(
    () => getJSON(`${base}/latest.json`),
    (err: Error) => {
      assert.match(err.message, /403/);
      assert.match(err.message, /forbidden/, "the store's error code must reach the operator");
      assert.match(err.message, /BLOB_READ_WRITE_TOKEN/, "say which credential was refused");
      assert.doesNotMatch(err.message, /wrong-token/, "never print a credential");
      return true;
    },
  );
});

test("a missing blob reads as null, not as an error", async () => {
  process.env.BLOB_READ_WRITE_TOKEN = "rw-token";
  accepted.add("rw-token");
  assert.equal(await getJSON(`${base}/missing.json`), null);
  assert.equal(await getStream(`${base}/missing.json`), null);
});

test("reading with no credential at all says so, rather than sending 'Bearer undefined'", async () => {
  await assert.rejects(() => getJSON(`${base}/latest.json`), /No Blob credential is set/);
  assert.equal(seen.length, 0);
});

test("photo bytes come back through the same authenticated read", async () => {
  process.env.BLOB_READ_WRITE_TOKEN = "rw-token";
  accepted.add("rw-token");
  const photo = await getStream(`${base}/photo.jpg`);
  assert.ok(photo);
  assert.equal(photo.contentType, "application/json");
  assert.equal(requestHeaders(0)["x-api-version"], undefined);
});

test("readCredentialNames reports names only", () => {
  process.env.BLOB_READ_WRITE_TOKEN = "rw-token";
  assert.deepEqual(readCredentialNames(), ["BLOB_READ_WRITE_TOKEN"]);
  process.env.VERCEL_OIDC_TOKEN = "oidc-token";
  assert.deepEqual(readCredentialNames(), ["VERCEL_OIDC_TOKEN", "BLOB_READ_WRITE_TOKEN"]);
});
