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
  assert.match(invoicePath(id), /^\/api\/orders\/H365-TEST-0001\/invoice\?t=[0-9a-f]{32}$/);
});
