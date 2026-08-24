import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSiteUrl, PRODUCTION_SITE_URL } from "@/lib/config";

/**
 * Production once shipped with NEXT_PUBLIC_SITE_URL unset, so the site URL fell
 * back to http://localhost:3000. The live sitemap advertised all 68 pages as
 * localhost, link previews pointed their image there — which is why no logo
 * appeared when the shop was shared — and the signed invoice link sent to a
 * customer would have pointed at their own machine.
 *
 * A missing environment variable must never be able to do that again.
 */

test("production never falls back to localhost", () => {
  const url = resolveSiteUrl(undefined, "production");
  assert.ok(!url.includes("localhost"), `got ${url}`);
  assert.ok(url.startsWith("https://"), `must be https, got ${url}`);
  assert.equal(url, PRODUCTION_SITE_URL);
});

test("an explicit NEXT_PUBLIC_SITE_URL still wins", () => {
  assert.equal(resolveSiteUrl("https://staging.example.com", "production"), "https://staging.example.com");
});

test("development still points at the local server", () => {
  assert.equal(resolveSiteUrl(undefined, "development"), "http://localhost:3000");
});

test("an unknown environment is treated as not-production, not as broken", () => {
  assert.equal(resolveSiteUrl(undefined, undefined), "http://localhost:3000");
});
