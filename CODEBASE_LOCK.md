# Codebase lock

**Locked on:** 2026-08-23 · **Version:** 1.0.0

This project is feature-frozen. The site is live-ready and the design is
settled; from here the default answer to "can we change X?" is **no, unless it
is on the allowed list below**. The point is that the storefront your customers
see this month is the storefront they see next month, and that a routine
dependency install can never quietly change what runs in production.

---

## 1. Dependencies are pinned

Every entry in `package.json` is an **exact version** — no `^`, no `~`. A fresh
install gets byte-identical code to what was tested.

```bash
npm ci      # install exactly what package-lock.json says — use this, not `npm install`
```

`npm ci` fails outright if `package.json` and `package-lock.json` disagree, so
an accidental version drift becomes a build error rather than a silent change.

**No new runtime dependencies without a deliberate decision.** The order path in
particular — PDF generation, database writes, email, WhatsApp — is written
against `fetch` and `node:crypto` only. That is why there is a hand-written PDF
writer in `src/lib/pdf/writer.ts` rather than a PDF library, and a 90-line
PostgREST client in `src/lib/storage/supabase.ts` rather than
`@supabase/supabase-js`: customer names, addresses and phone numbers pass
through that code, and it has no third-party code in it at all.

Current runtime dependencies (7): `clsx`, `next`, `qrcode`, `react`,
`react-dom`, `tailwind-merge`, `zustand`.

## 2. What may still change

| Allowed | Not allowed without sign-off |
| --- | --- |
| Product, brand and price data (`src/lib/mock/*`, the admin) | The design system — colours, type, spacing tokens |
| Copy and legal pages | Page layouts and component structure |
| Images and video assets | Adding or removing routes |
| Environment variables / config | New runtime dependencies |
| Security patches to pinned versions | Framework or React major upgrades |
| Bug fixes with no visual change | Anything touching the order or audit paths |

## 3. Before any change ships

```bash
npm run verify      # typecheck + lint + production build
```

All three must pass. `npm run verify` is the gate; nothing goes to production
red.

## 4. Security posture

| Area | What is in place |
| --- | --- |
| Admin password | scrypt hash via `ADMIN_PASSWORD_HASH`; constant-time compare; never stored plaintext |
| Admin session | HMAC-signed, 7-day expiring token. The cookie is **not** the password |
| Brute force | 5 login attempts per IP per 15 minutes; 12 orders per IP per 10 minutes |
| Admin routes | `middleware.ts` gates `/admin/*` and `/api/admin/*`; APIs 401 rather than redirect |
| Headers | CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy |
| Invoice links | HMAC-signed (`?t=`), unguessable, `no-store`, `noindex` |
| Database | RLS enabled with no permissive policy; anon/authenticated grants revoked |
| History | Postgres triggers reject `DELETE` on orders and models, and `UPDATE`/`DELETE` on the audit trail |

### Secrets that must be set in production

- `APP_SECRET` — the app **refuses to boot** in production without it.
  Generate with `openssl rand -hex 32`.
- `ADMIN_PASSWORD_HASH` — generate with `npm run admin:hash -- 'your password'`.
- `SUPABASE_SERVICE_ROLE_KEY` — server-only. Never expose it to the browser.

## 5. Data durability

Nothing an admin does is destructive:

- **Removing a product** sets `deleted_at`. The row stays, and it can be restored.
- **Every admin change** is appended to the audit trail with its before/after
  state, visible at `/admin/audit`.
- **The audit trail cannot be edited or deleted** — not by the admin UI, not by
  the app, not by the service-role key. A database trigger rejects the attempt.
- **Every order** is written to the database *and* sent as a PDF to both the
  customer and the store, so there are always at least two copies.

Until Supabase is configured, all of the above is written to an append-only file
journal instead, and the admin shows an amber banner saying exactly that. On a
serverless host that journal does not survive a redeploy — **configure Supabase
before taking real orders.**

## 6. Setup checklist for going live

- [ ] Run `supabase/schema.sql` in the Supabase SQL editor
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Set `APP_SECRET` (`openssl rand -hex 32`)
- [ ] Set `ADMIN_PASSWORD_HASH` (`npm run admin:hash -- '…'`) and remove `ADMIN_PASSWORD`
- [ ] Set `RESEND_API_KEY` + verify your sending domain
- [ ] Set `ORDER_NOTIFY_EMAIL` to the inbox that should get every order
- [ ] Set `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` (see `.env.example`)
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the real domain — invoice links are built from it
- [ ] Confirm the admin dashboard banner is **green**, not amber
- [ ] Place one test order and confirm the PDF arrives by both email and WhatsApp
