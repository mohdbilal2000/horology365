-- Horology365 — database schema.
--
-- Run this once in the Supabase SQL editor, then set NEXT_PUBLIC_SUPABASE_URL
-- and SUPABASE_SERVICE_ROLE_KEY in your hosting environment. Until you do, the
-- app falls back to an append-only file journal and says so in the admin.
--
-- Design rule, enforced here rather than only in application code: history is
-- never destroyed. Orders and admin models are insert/update-only; the audit
-- trail is insert-only. There is no policy that permits a DELETE, so even a
-- compromised app key cannot erase records.

-- ─── Orders ────────────────────────────────────────────────────────
create table if not exists public.orders (
  id              text primary key,
  created_at      timestamptz not null default now(),
  status          text not null default 'pending',
  total           numeric(12, 2) not null,
  customer_name   text not null,
  customer_phone  text not null,
  customer_email  text,
  payment_method  text not null,
  upi_reference   text,
  -- Full typed order, so the record stays complete even as columns evolve.
  payload         jsonb not null
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_phone_idx on public.orders (customer_phone);

-- ─── Admin catalog ─────────────────────────────────────────────────
-- `deleted_at` is a soft delete. Rows are never removed.
create table if not exists public.admin_models (
  id          text primary key,
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  payload     jsonb not null
);

create index if not exists admin_models_updated_at_idx
  on public.admin_models (updated_at desc);

-- ─── Audit trail ───────────────────────────────────────────────────
-- Append-only: every admin change, with its before/after state.
create table if not exists public.admin_audit (
  id         uuid primary key,
  at         timestamptz not null default now(),
  action     text not null,
  target_id  text not null,
  summary    text not null,
  actor      text not null default 'admin',
  before     jsonb,
  after      jsonb
);

create index if not exists admin_audit_at_idx on public.admin_audit (at desc);
create index if not exists admin_audit_target_idx on public.admin_audit (target_id);

-- ─── Row Level Security ────────────────────────────────────────────
-- The app talks to these tables only with the service-role key from server
-- routes, which bypasses RLS. Enabling RLS with no permissive policy therefore
-- means: nothing reachable with the public anon key can read or write any of
-- this. Customer addresses and phone numbers are never exposed to the browser.

alter table public.orders       enable row level security;
alter table public.admin_models enable row level security;
alter table public.admin_audit  enable row level security;

-- Belt and braces: revoke the anon/authenticated grants PostgREST would
-- otherwise expose, so a leaked anon key cannot even attempt a read.
revoke all on public.orders       from anon, authenticated;
revoke all on public.admin_models from anon, authenticated;
revoke all on public.admin_audit  from anon, authenticated;

-- ─── History protection ────────────────────────────────────────────
-- Block UPDATE and DELETE on the audit trail outright. This fires even for the
-- service role, so an application bug cannot rewrite what happened.
create or replace function public.audit_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'admin_audit is append-only; % is not permitted', tg_op;
end;
$$;

drop trigger if exists admin_audit_no_update on public.admin_audit;
create trigger admin_audit_no_update
  before update or delete on public.admin_audit
  for each row execute function public.audit_is_append_only();

-- Same protection for orders: an order may be updated (status transitions) but
-- never removed.
create or replace function public.no_delete()
returns trigger
language plpgsql
as $$
begin
  raise exception 'rows in % are never deleted', tg_table_name;
end;
$$;

drop trigger if exists orders_no_delete on public.orders;
create trigger orders_no_delete
  before delete on public.orders
  for each row execute function public.no_delete();

drop trigger if exists admin_models_no_delete on public.admin_models;
create trigger admin_models_no_delete
  before delete on public.admin_models
  for each row execute function public.no_delete();
