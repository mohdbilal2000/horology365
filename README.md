# Horology365

A production-grade e-commerce website for **Horology365** — an affordable / fashion-tier
watch reseller running a **pre-order drop** model. Design direction: **"The Showroom"** —
a dense, video-led, brand-organized storefront with alternating dark/light "bays", a single
champagne-gold accent (`#C8A55B`), display serif headlines and a clean grotesk sans.

> **Status:** Phase 1 (Frontend) is complete. The full site is clickable and demo-ready
> against a typed mock-data layer with **zero backend required**. Checkout takes **UPI**
> today — pay to our VPA via a generated QR / UPI ID and enter the transaction reference
> (orders stay `pending` until the payment is verified — fail closed). **Cash on Delivery**
> is "coming soon" and flips on via a single env flag. Phase 2 (Supabase + Razorpay UPI +
> admin) swaps the mock layer for real queries and a verified gateway.

## Stack

- **Next.js 15** (App Router) + **TypeScript** (strict, `noUncheckedIndexedAccess`)
- **Tailwind CSS** — design tokens in `tailwind.config.ts`
- **Zustand** — cart state, persisted to `localStorage`
- `next/image`, `next/font`, native `<video>` with `preload="none"` + poster
- **Supabase** (Phase 2) — Postgres, Auth, Storage
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
    types.ts                # domain types (mirror the Phase 2 Supabase schema)
    config.ts               # site + payment-mode config from env
    utils.ts  validation.ts
    store/cart.ts           # Zustand cart (+ derived selectors)
    mock/                   # typed mock-data layer (brands, products, banners, …)
```

### The mock-data layer

Everything reads from `@/lib/mock` (brands, categories, products, banners, offers,
reviews) through functions like `getProductBySlug`, `getProductsByBrand`,
`searchProducts`. In **Phase 2** this module is replaced by Supabase queries with the
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

- Supabase schema + migrations + seed; RLS (public read on active
  brands/categories/products/offers/banners/reviews; writes restricted to authenticated
  admin; `orders` / `order_items` inserted via server route only).
- Swap `@/lib/mock` for typed Supabase queries.
- Razorpay UPI checkout: server route creates the order, client opens UPI, a server route
  verifies the signature before writing `orders` + `order_items` and marking `paid`
  (**fail closed** — never mark paid without a verified signature). Order-confirmation
  email + WhatsApp link.
- `/admin/*` (Supabase Auth): dashboard (orders + revenue), product CRUD with
  image/video upload to Storage, order status transitions, brand/banner/offer management.
