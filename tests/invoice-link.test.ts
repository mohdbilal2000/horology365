import { test } from "node:test";
import assert from "node:assert/strict";
import { invoiceToken, verifyInvoiceToken, invoicePath } from "../src/lib/orders/invoiceLink";

/**
 * Invoice links are public — Meta fetches them to attach the PDF to a WhatsApp
 * message — so the signature is the only thing between a scraper and every
 * customer's name, address and phone number. Order ids are a base36 timestamp
 * plus four characters, i.e. walkable.
 */

test("only a correctly signed invoice link is accepted", () => {
  const id = "H365-TEST-0001";
  const token = invoiceToken(id);

  assert.equal(verifyInvoiceToken(id, token), true, "the real token must verify");
  assert.equal(verifyInvoiceToken(id, null), false, "a missing token must be refused");
  assert.equal(verifyInvoiceToken(id, "0".repeat(32)), false, "a wrong token must be refused");
  assert.equal(
    verifyInvoiceToken("H365-TEST-0002", token),
    false,
    "a token must not open a different order — otherwise one leaked link opens all of them",
  );
  const path = invoicePath(id);
  assert.ok(path, "signing is available in tests, so a path should be produced");
  assert.match(path, /^\/api\/orders\/H365-TEST-0001\/invoice\?t=[0-9a-f]{32}$/);
});

test("a missing APP_SECRET hides the link instead of breaking the page", async () => {
  // In production appSecret() throws by design. Anything on a rendering path
  // must ask first, or a customer who has just paid gets a 500 on the order
  // confirmation page instead of their receipt.
  const originalSecret = process.env.APP_SECRET;
  const originalEnv = process.env.NODE_ENV;
  try {
    delete process.env.APP_SECRET;
    process.env.NODE_ENV = "production";

    // Fresh module instance so config.ts re-reads the environment.
    const mod = await import(`../src/lib/orders/invoiceLink.ts?nosecret=${Date.now()}`);

    assert.equal(mod.invoiceSigningAvailable(), false, "signing must report itself unavailable");
    assert.equal(mod.invoicePath("H365-TEST-0001"), undefined, "no link rather than a thrown error");
    assert.equal(
      mod.verifyInvoiceToken("H365-TEST-0001", "0".repeat(32)),
      false,
      "an unverifiable request is simply not authorised",
    );
  } finally {
    if (originalSecret === undefined) delete process.env.APP_SECRET;
    else process.env.APP_SECRET = originalSecret;
    process.env.NODE_ENV = originalEnv;
  }
});
