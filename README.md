# Horology365

A production-grade e-commerce website for **Horology365** — an affordable / fashion-tier
watch reseller running a **pre-order drop** model. Design direction: **"The Showroom"** —
a dense, video-led, brand-organized storefront with alternating dark/light "bays", a single
champagne-gold accent (`#C8A55B`), display serif headlines and a clean grotesk sans.

> **Status:** Feature-frozen at v1.0.0 — see [`CODEBASE_LOCK.md`](./CODEBASE_LOCK.md).
> The storefront runs against a typed mock-data layer. Checkout takes **UPI** today — pay
> to our VPA via a generated QR / UPI ID and enter the transaction reference (orders stay
> `pending` until the payment is verified — fail closed). **Cash on Delivery** flips on via
> a single env flag.
>
> Every order is **persisted server-side and delivered as a PDF invoice to both the
> customer and the store, over email and WhatsApp**, so there are always at least two
> copies of the record. Admin changes are stored server-side, **never hard-deleted**, and
> written to an append-only audit trail at `/admin/audit`.

## Stack

- **Next.js 15** (App Router) + **TypeScript** (strict, `noUncheckedIndexedAccess`)
- **Tailwind CSS** — design tokens in `tailwind.config.ts`
- **Zustand** — cart state, persisted to `localStorage`
- `next/image`, `next/font`, native `<video>` with `preload="none"` + poster
- **Supabase** — Postgres for orders, admin catalog and the audit trail (via plain REST;
  no client library dependency). Schema in [`supabase/schema.sql`](./supabase/schema.sql)
- **Resend** — order confirmation email with the invoice PDF attached
- **Meta WhatsApp Cloud API** — the same invoice PDF pushed to the customer and the store
- **Razorpay** UPI (later) — Orders API + server-side signature verification
- **Vercel** hosting

## Getting started

```bash
# 1. Install — use `ci`, not `install`: every version is pinned exactly.
npm ci

# 2. Configure env (all optional in Phase 1 — sensible fallbacks exist)
cp .env.example .env.local

# 3. Run
npm run dev          # http://localhost:3000

# Other scripts
npm run build        # production build (prerenders all routes)
npm run typecheck    # tsc --noEmit (strict)
npm run lint         # next lint
```

No database or API keys are needed to click through the site locally. They **are**
needed before taking real orders — see the checklist in
[`CODEBASE_LOCK.md`](./CODEBASE_LOCK.md#6-setup-checklist-for-going-live). Until Supabase
is configured, orders and admin changes go to an append-only file journal and the admin
dashboard shows an amber banner saying so.

## Environment variables

See [`.env.example`](./.env.example) for the full list. The most relevant in Phase 1:

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL (metadata, sitemap, OG) | `http://localhost:3000` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | wa.me number for support / order deep links | `919999999999` |
| `NEXT_PUBLIC_PAYMENT_MODE` | `upi` \| `cod` \| `both` — controls checkout options | `upi` |
| `NEXT_PUBLIC_UPI_VPA` | UPI ID shown at checkout for the pay-to QR | `horology365@upi` |
| `NEXT_PUBLIC_GA4_ID` / `NEXT_PUBLIC_META_PIXEL_ID` | Analytics (scripts only load when set) | _unset_ |
| `APP_SECRET` | **Required in production.** Signs invoice links + admin sessions | _fails closed_ |
| `ADMIN_PASSWORD_HASH` | scrypt hash of the admin password (`npm run admin:hash`) | _unset_ |
| `SUPABASE_SERVICE_ROLE_KEY` | Durable storage for orders, catalog and audit | _unset_ |
| `RESEND_API_KEY` | Order email with PDF attached | _unset_ |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_ID` | Automatic WhatsApp PDF delivery | _wa.me fallback_ |

**Switching payment modes:** UPI is active now (`upi`). Set
`NEXT_PUBLIC_PAYMENT_MODE=cod` to make Cash on Delivery the live method, or `both` to
offer both. The checkout UI, the `/api/orders` route and the order model all branch on
this flag. Set `NEXT_PUBLIC_UPI_VPA` to your real UPI ID before going live; the QR is
generated client-side from the standard NPCI `upi://pay` URI.

## Project structure

```
src/
  app/
    layout.tsx              # fonts, metadata, header/footer, cart drawer, WhatsApp float
    page.tsx                # homepage — assembles every showroom section
    brand/[slug]/           # one template, all 9 active brands (SSG)
    category/[slug]/        # men / women (SSG)
    product/[slug]/         # gallery + zoom, JSON-LD, related (SSG)
    cart/  checkout/  order/[id]/
    about/  why-buy/  contact/
    legal/{terms,privacy,shipping,returns}/
    api/orders/route.ts     # validated order creation -> persist + deliver PDF
    api/orders/[id]/invoice # HMAC-signed PDF download (Meta fetches this)
    api/admin/catalog       # server-side catalog CRUD (soft delete only)
    api/admin/audit         # read-only append-only change history
    admin/audit/            # audit log UI
    sitemap.ts  robots.ts  not-found.tsx
  components/               # SiteHeader, VideoHero, BrandBay, ProductCard, CartDrawer, …
  lib/
    types.ts                # domain types (mirror the Phase 2 Supabase schema)
    config.ts               # site + payment-mode config from env
    utils.ts  validation.ts
    pricing.ts              # pure cart maths, shared by client and server
    rateLimit.ts            # in-process limiter for login + orders
    adminAuth.ts            # scrypt password check (Node only)
    adminSession.ts         # HMAC session tokens (Edge-safe, used by middleware)
    pdf/                    # dependency-free PDF writer + invoice layout
    notify/                 # email (Resend) + WhatsApp (Meta) + dispatch
    orders/                 # order repo + signed invoice links
    admin/                  # catalog repo (soft delete) + audit trail
    storage/                # Supabase REST client + append-only file journal
    store/cart.ts           # Zustand cart (+ derived selectors)
    mock/                   # typed mock-data layer (brands, products, banners, …)
```

### The mock-data layer

Everything reads from `@/lib/mock` (brands, categories, products, banners, offers,
reviews) through functions like `getProductBySlug`, `getProductsByBrand`,
`searchProducts`. In **Phase 2** this module is replaced by Supabase queries with the
**same signatures**, so components never change.

**Active brands (9):** Casio, Timex, Titan, Fastrack, Sonata, Fossil, French Connection,
Carter London, Titan Raga. (Armani Exchange, Diesel, Michael Kors, Guess and Lacoste are
seeded but delisted — flip `isActive` in `src/lib/mock/brands.ts` to bring one back.)
**Categories:** Men's Watches, Women's Watches.

## Accessibility & performance

- Mobile-first, responsive 360px → 1440px.
- Skip-to-content link, visible gold focus rings, `aria` labels, keyboard-navigable
  carousels/menus/dialogs, alt text on every image.
- `prefers-reduced-motion` honored (autoplay videos and scroll-reveal stand down).
- Lazy videos (`preload="none"` + poster, play only in view), `next/image` AVIF/WebP,
  per-route metadata, Product JSON-LD, `sitemap.ts` / `robots.ts`, env-gated GA4 + Meta
  Pixel.

## Deploy (Vercel)

1. Push to GitHub and import the repo into Vercel.
2. Set the environment variables from `.env.example` (Phase 1 needs none to boot, but set
   `NEXT_PUBLIC_SITE_URL` for correct metadata/sitemap).
3. Build command `next build`, output is detected automatically. Deploy.

## Order delivery

When an order validates, `POST /api/orders`:

1. **Persists it** — Supabase when configured, an append-only journal otherwise.
2. **Renders a PDF invoice** — `src/lib/pdf`, no third-party library.
3. **Sends it to the customer and the store**, concurrently, over email and WhatsApp.

None of the three can fail the others. A delivery outage downgrades the response (the
confirmation page then reports what actually happened, and offers a `wa.me` link) but
never rejects an order that has already been paid for.

WhatsApp needs a Meta Cloud API account. Until `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID`
are set, the site returns a prefilled `wa.me` link containing a signed invoice URL, so you
can forward it by hand. Note Meta's 24-hour rule: free-form messages are only allowed
within 24h of the customer messaging you, so set `WHATSAPP_TEMPLATE_NAME` to an approved
template for first-time buyers.

## Data retention

Nothing an admin does destroys a record:

- Removing a product sets `deleted_at`; the row stays and can be restored.
- Every change is appended to the audit trail with before/after state (`/admin/audit`).
- The audit trail cannot be edited or deleted — a Postgres trigger rejects `UPDATE` and
  `DELETE` outright, even for the service role.
- Orders can transition status but can never be deleted.

## Roadmap

- Razorpay UPI: server route creates the order, client opens UPI, a server route verifies
  the signature before marking `paid` (**fail closed** — never mark paid without a
  verified signature).
- Swap `@/lib/mock` for typed Supabase queries with the same signatures.
- Per-admin accounts via Supabase Auth (the audit trail already records an `actor`).
