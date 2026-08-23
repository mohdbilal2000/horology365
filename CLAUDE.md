# Horology365

Watch-store e-commerce site (Next.js 15 App Router, TypeScript strict,
Tailwind, Zustand) for a real client. `main` deploys straight to production
(www.horology365.com on Vercel), so treat every push as a release.

## Commands

- `npm run verify` — the gate: typecheck + lint + all tests + build. **Run
  before every push; exit 0 or don't ship.**
- `npm run test` — fast suites (data safety, invoice links, inventory maths)
- `npm run test:db` — integration tests against a throwaway real Postgres
- `npm run db:setup` — create tables + protection triggers (idempotent; must
  end "protection triggers: 6 of 6")
- `npm run seed` — load the starter catalogue (insert-only)
- `npm run db:backup` — full JSON backup to a local file
- `npm run health` — what production actually has configured
- `npm run dev` — local server on :3000

## Architecture

- Plain PostgreSQL over `pg` — **no vendor SDK**. Connection from
  `DATABASE_URL` (or Vercel's `POSTGRES_URL`); schema and migrations in `db/`.
- `src/lib/db/client.ts` — pooled query helpers (server-only)
- `src/lib/data/` — all SQL lives here, not in route handlers.
  `adminProductQueries.ts` is the only writer of products.
- `src/lib/mock/` — static fallback catalogue served when no DB is configured;
  `DEAL_OFF` there applies brand-wide discounts **at first seed only**
- `src/lib/notify/` — order invoice delivery (Resend email + WhatsApp Cloud
  API); `src/lib/invoice.tsx` renders the PDF via @react-pdf
- `src/lib/orders/invoiceLink.ts` — HMAC-signed invoice URLs (`APP_SECRET`)
- `/api/health` — force-dynamic config report; the admin banner reads it

## Data-safety rules (client lost data once — these are load-bearing)

1. **Never hard-delete a product or order.** Removal = set `deleted_at`.
   There is no `delete from products` anywhere; DB triggers also refuse
   DELETE/TRUNCATE. Keep it that way.
2. **Seeding is insert-only**: `on conflict (slug) do nothing`. Never change
   it to `do update` — that exact upsert destroyed the client's products once.
3. **`admin_audit` is append-only.** Every admin mutation records an audit
   entry with before/after.
4. **Restore never overwrites** existing rows (insert-only), so it can't
   become a new way to lose data.
5. `tests/data-safety.test.ts` enforces all of this. **If it fails, fix the
   code, never loosen the test.**

## Conventions

- Every read of products filters `deleted_at is null`.
- Parameterised SQL only — never interpolate values into query strings.
- Secrets stay in Vercel env / `.env.local` (gitignored). Never print, log,
  or commit them; never echo a token into chat or a file.
- Dependencies are pinned exactly; add nothing to the order/data path without
  strong reason (see CODEBASE_LOCK-era rationale in DATA_SAFETY.md).
- Docs: DATABASE.md (hosting/pooling), DATA_SAFETY.md (protections).
