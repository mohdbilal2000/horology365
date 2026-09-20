import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { startBlobStub, type BlobStub } from "./stubs/blob-server";

/**
 * Store settings (payment identity + WhatsApp credentials) round-trip through
 * the real Blob read-modify-write code against a stub, and — critically — the
 * WhatsApp token is never exposed by the public projection and is masked by the
 * admin one. Blank patch fields must never wipe a live value.
 */

let stub: BlobStub;

before(async () => {
  stub = await startBlobStub();
});
after(() => stub.server.close());
beforeEach(() => stub.reset());

test("with nothing stored, the shipped defaults come through", async () => {
  const { readSettings } = await import("@/lib/data/settings");
  const s = await readSettings();
  assert.ok(s.upiVpa.length > 0, "a default UPI id must be present");
  assert.equal(s.updatedAt, null);
});

test("a saved value is read back; a blank field keeps the current value", async () => {
  const { writeSettings, readSettings } = await import("@/lib/data/settings");
  await writeSettings({ upiVpa: "shop@okhdfc", bankIfsc: "hdfc0001234" });
  let s = await readSettings();
  assert.equal(s.upiVpa, "shop@okhdfc");
  assert.equal(s.bankIfsc, "hdfc0001234");

  // A whitespace-only field must not overwrite what's stored.
  await writeSettings({ upiVpa: "   " });
  s = await readSettings();
  assert.equal(s.upiVpa, "shop@okhdfc", "a blank field must keep the saved value");
});

test("the public projection never carries the WhatsApp token", async () => {
  const { writeSettings, readSettings, toPublicPayment } = await import(
    "@/lib/data/settings"
  );
  await writeSettings({ whatsappToken: "SECRET-TOKEN-XYZ-9999" });
  const pub = toPublicPayment(await readSettings());
  assert.equal("whatsappToken" in pub, false);
  assert.equal(JSON.stringify(pub).includes("SECRET-TOKEN"), false);
});

test("the admin view masks the token to its last four characters", async () => {
  const { writeSettings, readSettings, toAdminView } = await import(
    "@/lib/data/settings"
  );
  await writeSettings({ whatsappToken: "abcdEFGHijkl6789" });
  const v = toAdminView(await readSettings());
  assert.equal(v.whatsappTokenSet, true);
  assert.ok(v.whatsappTokenHint.endsWith("6789"));
  assert.equal(v.whatsappTokenHint.includes("abcdEFGH"), false);
});

test("saving other fields keeps a previously-saved token", async () => {
  const { writeSettings, getWhatsAppRuntime } = await import("@/lib/data/settings");
  await writeSettings({ whatsappToken: "keep-me-token", whatsappPhoneId: "12345" });
  await writeSettings({ upiVpa: "shop2@okaxis" }); // no token in this patch
  const wa = await getWhatsAppRuntime();
  assert.equal(wa.token, "keep-me-token");
  assert.equal(wa.enabled, true);
});
