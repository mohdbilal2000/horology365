# Horology365

Watch-store e-commerce site (Next.js 15 App Router, TypeScript strict,
Tailwind, Zustand) for a real client. `main` deploys straight to production
(www.horology365.com on Vercel), so treat every push as a release.

## Commands

- `npm run verify` — the gate: typecheck + lint + all tests + build. **Run
  before every push; exit 0 or don't ship.**
- `npm run test` — all suites (data safety, catalogue/orders/audit against a
  stub Blob server, invoice links, inventory maths) — no external service
  needed, this is the whole gate now
- `npm run setup:prod -- "<BLOB_READ_WRITE_TOKEN>"` — loads the starter
  catalogue into a fresh Vercel project (insert-only; safe to re-run)
- `npm run seed` — load the starter catalogue (insert-only)
- `npm run db:backup` — full JSON backup to a local file
- `npm run health` — what production actually has configured
- `npm run dev` — local server on :3000

## Architecture

- **No database.** Products, orders and the admin audit trail live in
  **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`), addressed over its plain REST API
  — hand-rolled, not the `@vercel/blob` SDK, so it's testable against a local
  stub server (`tests/stubs/blob-server.ts`). See DATABASE.md for why.
- `src/lib/data/blobClient.ts` — the only thing that talks to Blob. No delete
  function exists in it, deliberately.
- `src/lib/data/catalogue.ts` — the only writer of products. Every write is a
  new, immutable `store/catalogue/history/*.json` file before the small
  `store/catalogue/latest.json` pointer is updated. Never overwrites, never
  removes an entry from the array.
- `src/lib/data/orders.ts`, `adminAudit.ts` — same pattern: `store/orders/<id>/`
  and `store/audit/` respectively.
- `src/lib/data/images.ts` — product photos are their own Blob objects
  (`store/images/…`), not bytes embedded in the catalogue.
- `src/lib/mock/` — static fallback catalogue served when Blob isn't
  configured or a read fails; `DEAL_OFF` there applies brand-wide discounts
  **at first seed only**
- `src/lib/notify/` — order invoice delivery (Resend email + WhatsApp Cloud
  API); `src/lib/invoice.tsx` renders the PDF via @react-pdf
- `src/lib/orders/invoiceLink.ts` — HMAC-signed invoice URLs (`APP_SECRET`)
- `/api/health` — force-dynamic config report, including live storage size;
  the admin banner reads it

## Data-safety rules (client lost data twice — these are load-bearing)

1. **Never remove a product or order from stored data.** Removal = set
   `deleted_at`. There is no code path in `catalogue.ts` that shrinks the
   stored array, and `blobClient.ts` has no delete function at all. Keep it
   that way.
2. **Seeding and restoring are insert-only**, both through
   `restoreCatalogueEntries()` in `catalogue.ts`. Never make either capable of
   overwriting an existing product (matched by slug) — that exact upsert
   destroyed the client's products once.
3. **The audit trail is append-only by construction.** Every admin mutation
   writes its own uniquely-named file under `store/audit/`; there is no
   update or delete path in `adminAudit.ts`.
4. **The database itself disappearing is a real failure mode, not a
   hypothetical** — it happened. That's why storage is Blob, not a database:
   no connection to drop, no bandwidth allowance to exceed, nothing that goes
   away except by someone deleting the whole Vercel project. The nightly
   snapshot email (`/api/cron/backup`) is what actually survives that.
5. `tests/data-safety.test.ts` and `tests/catalogue.test.ts` enforce all of
   this — the latter against real read-modify-write behavior, not just source
   patterns. **If either fails, fix the code, never loosen the test.**

## Conventions

- Every read of products filters on `deleted_at`.
- Secrets stay in Vercel env / `.env.local` (gitignored). Never print, log,
  or commit them; never echo a token into chat or a file.
- Dependencies are pinned exactly; add nothing to the order/data path without
  strong reason (see CODEBASE_LOCK-era rationale in DATA_SAFETY.md).
- Docs: DATABASE.md (storage layout, migrating hosts), DATA_SAFETY.md (protections).
