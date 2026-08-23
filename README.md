# Horology365

A production-grade e-commerce website for **Horology365** — an affordable / fashion-tier
watch reseller running a **pre-order drop** model. Design direction: **"The Showroom"** —
a dense, video-led, brand-organized storefront with alternating dark/light "bays", a single
champagne-gold accent (`#C8A55B`), display serif headlines and a clean grotesk sans.

> **Status:** Phase 1 (Frontend) is complete. The full site is clickable and demo-ready
> against a typed mock-data layer with **zero backend required**. Checkout takes **UPI**
> today — pay to our VPA via a generated QR / UPI ID and enter the transaction reference
> (orders stay `pending` until the payment is verified — fail closed). **Cash on Delivery**
> is "coming soon" and flips on via a single env flag. (Razorpay card checkout +
> admin) swaps the mock layer for real queries and a verified gateway.


## Product data safety

Products the store owner saves are never destroyed. Removing one is a soft
delete that can be undone from `/admin/trash`; re-seeding can only ever add
products, never overwrite an existing one; and every admin change is recorded in
an append-only audit trail. Postgres triggers reject a hard delete even for the
service-role key.

This is enforced by `tests/data-safety.test.ts`, which runs in CI on every push.
**If one of those tests fails, do not loosen it** — it means the change can
destroy live data. Full detail: [`DATA_SAFETY.md`](./DATA_SAFETY.md).

Applying to an existing database: run
`db/migrations/20260823-product-data-safety.sql` once.



## Database

Plain PostgreSQL over the standard wire protocol — **no vendor SDK**. One
environment variable moves the whole app between Supabase, Neon, Railway, RDS or
your own server:

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

Schema and migrations live in `db/`. **Use a transaction-mode pooler in
production** — serverless functions each open their own connections and will
exhaust Postgres otherwise. Full detail: [`DATABASE.md`](./DATABASE.md).

## Order delivery

When an order is placed, the invoice PDF goes to **both the customer and the
store**, over email (Resend) and WhatsApp (Meta Cloud API), so there are always
at least two copies of the record outside the database.

Delivery can never fail an order: the two channels run independently, and a
failure only downgrades the response — the confirmation page then reports what
actually happened and offers a manual `wa.me` link. Without
`WHATSAPP_TOKEN`/`WHATSAPP_PHONE_ID` nothing is sent automatically and that
fallback link is returned instead, so the flow works before the Business API
account is approved. Meta's 24-hour rule means first-time buyers need an
approved template — set `WHATSAPP_TEMPLATE_NAME`.

Invoice links are HMAC-signed (`?t=…`). They have to be publicly fetchable so
Meta can attach the PDF, and order ids are guessable, so without a signature a
scraper could walk them and harvest customers' names, addresses and phone
numbers. **`APP_SECRET` is required in production.**

## Stack

- **Next.js 15** (App Router) + **TypeScript** (strict, `noUncheckedIndexedAccess`)
- **Tailwind CSS** — design tokens in `tailwind.config.ts`
- **Zustand** — cart state, persisted to `localStorage`
- `next/image`, `next/font`, native `<video>` with `preload="none"` + poster
- **PostgreSQL** via `pg` — no vendor SDK, so any provider works ([`DATABASE.md`](./DATABASE.md))
- **Razorpay** UPI (Phase 2) — Orders API + server-side signature verification
- **Vercel** hosting

## Getting started

```bash
# 1. Install
npm install

# 2. Configure env (all optional in Phase 1 — sensible fallbacks exist)
cp .env.example .env.local

# 3. Run
npm run dev          # http://localhost:3000

# Other scripts
npm run build        # production build (prerenders all routes)
npm run typecheck    # tsc --noEmit (strict)
npm run lint         # next lint
```

No database, API keys or seeding are needed to run Phase 1.

## Environment variables

See [`.env.example`](./.env.example) for the full list. The most relevant in Phase 1:

| Variable | Purpose | Default |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL (metadata, sitemap, OG) | `http://localhost:3000` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | wa.me number for support / order deep links | `919999999999` |
| `NEXT_PUBLIC_PAYMENT_MODE` | `upi` \| `cod` \| `both` — controls checkout options | `upi` |
| `NEXT_PUBLIC_UPI_VPA` | UPI ID shown at checkout for the pay-to QR | `horology365@upi` |
| `NEXT_PUBLIC_GA4_ID` / `NEXT_PUBLIC_META_PIXEL_ID` | Analytics (scripts only load when set) | _unset_ |

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
    brand/[slug]/           # one template, all active brands (SSG)
    category/[slug]/        # men / women (SSG)
    product/[slug]/         # gallery + zoom, JSON-LD, related (SSG)
    cart/  checkout/  order/[id]/
    about/  why-buy/  contact/
    legal/{terms,privacy,shipping,returns}/
    api/orders/route.ts     # server-validated order creation (fail-closed)
    sitemap.ts  robots.ts  not-found.tsx
  components/               # SiteHeader, VideoHero, BrandBay, ProductCard, CartDrawer, …
  lib/
    types.ts                # domain types (mirror the database schema)
    config.ts               # site + payment-mode config from env
    utils.ts  validation.ts
    store/cart.ts           # Zustand cart (+ derived selectors)
    mock/                   # typed mock-data layer (brands, products, banners, …)
```

### The mock-data layer

Everything reads from `@/lib/mock` (brands, categories, products, banners, offers,
reviews) through functions like `getProductBySlug`, `getProductsByBrand`,
`searchProducts`. With a database configured these are served by SQL queries with the
**same signatures**, so components never change.

**Active brands (9):** Casio, G-Shock, Timex, Sonata, Titan, Fastrack, French Connection,
Carter London, Titan Raga. (Armani Exchange, Diesel, Michael Kors, Guess, Lacoste and
Fossil are seeded but delisted — flip `isActive` in `src/lib/mock/brands.ts` and remove
the slug from `DELISTED_BRAND_SLUGS` in `src/lib/data/brands.ts` to bring one back.
G-Shock is split out of Casio: `src/lib/data/products.ts` files G-Shock/Baby-G watches
under the dedicated g-shock brand.)
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

## Roadmap — Phase 2 (Backend)

- Schema + migrations + seed live in `db/`; RLS (public read on active
  brands/categories/products/offers/banners/reviews; writes restricted to authenticated
  admin; `orders` / `order_items` inserted via server route only).
- Swap `@/lib/mock` for typed SQL queries.
- Razorpay UPI checkout: server route creates the order, client opens UPI, a server route
  verifies the signature before writing `orders` + `order_items` and marking `paid`
  (**fail closed** — never mark paid without a verified signature). Order-confirmation
  email + WhatsApp link.
- `/admin/*`: dashboard (orders + revenue), product CRUD with
  image/video upload to Storage, order status transitions, brand/banner/offer management.
