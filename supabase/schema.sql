-- Horology365 — Supabase schema (Phase 2)
--
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query)
-- after creating a free Supabase project. Safe to re-run: every statement is
-- guarded with IF NOT EXISTS / OR REPLACE where Postgres allows it.

create extension if not exists pgcrypto; -- for gen_random_uuid()

-- ── Catalog tables ───────────────────────────────────────────────

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  description text not null default '',
  image_url   text not null default ''
);

create table if not exists public.brands (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  tagline     text not null default '',
  logo_url    text not null default '',
  cover_url   text not null default '',
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- Variants live as JSONB (Variant[]) rather than a join table: the admin
-- product builder always reads/writes the whole array together, so a
-- relational table would only add write complexity with no query benefit.
create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  description   text not null default '',
  brand_slug    text not null references public.brands(slug) on update cascade,
  category_slug text not null,
  price         integer not null check (price >= 0),
  mrp           integer not null check (mrp >= 0),
  images        jsonb not null default '[]'::jsonb,  -- ProductImage[] { url, alt }
  video_url     text,
  video_poster  text,
  rating        numeric(2,1) not null default 0,
  review_count  integer not null default 0,
  stock         integer not null default 0,          -- denormalized sum of non-preorder variant stockQty
  is_preorder   boolean not null default false,
  drop_date     date,
  is_featured   boolean not null default false,
  tags          text[] not null default '{}',
  variants      jsonb not null default '[]'::jsonb,   -- Variant[]; empty for flat/legacy products
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists products_brand_slug_idx on public.products (brand_slug);
create index if not exists products_category_slug_idx on public.products (category_slug);

-- ── Orders ───────────────────────────────────────────────────────

create table if not exists public.orders (
  id                   text primary key,             -- app-generated via generateOrderId()
  items                jsonb not null,                -- CartItem[]
  details              jsonb not null,                -- CheckoutDetails
  payment_method       text not null check (payment_method in ('cod', 'upi', 'card')),
  upi_reference        text,
  subtotal             integer not null,
  shipping             integer not null,
  total                integer not null,
  status               text not null default 'pending' check (status in ('pending', 'paid', 'shipped', 'delivered')),
  razorpay_order_id    text,
  razorpay_payment_id  text,
  razorpay_signature   text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create unique index if not exists orders_razorpay_order_id_idx
  on public.orders (razorpay_order_id) where razorpay_order_id is not null;

-- ── Row Level Security ───────────────────────────────────────────
-- Catalog tables: public can read, nobody can write via the anon key (writes
-- only ever happen server-side with the service-role key, which bypasses RLS
-- entirely). Orders: zero policies at all — the anon key cannot read or write
-- a single row, by construction, not by convention.

alter table public.categories enable row level security;
alter table public.brands     enable row level security;
alter table public.products   enable row level security;
alter table public.orders     enable row level security;

drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select using (true);

drop policy if exists "public read brands" on public.brands;
create policy "public read brands" on public.brands for select using (true);

drop policy if exists "public read products" on public.products;
create policy "public read products" on public.products for select using (true);

-- Intentionally no policies on public.orders.
