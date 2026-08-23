-- Product data safety — run this once against an existing database.
--
-- Why this exists: products the store owner entered by hand, together with the
-- photos he uploaded for them, were lost. Two things made that possible and
-- both are closed here.
--
--   1. `DELETE /api/admin/products/:id` removed the row outright. It is now a
--      soft delete, so a removal is reversible and the record is never gone.
--   2. Re-running the catalog seed upserted every product from the code's mock
--      data over the top of the live rows, reverting any edits (including
--      replaced images). The seed is now insert-only for products.
--
-- Safe to re-run.

-- ── Soft delete ────────────────────────────────────────────────────
alter table public.products
  add column if not exists deleted_at timestamptz;

-- Every read path filters on this, so keep it cheap.
create index if not exists products_deleted_at_idx
  on public.products (deleted_at)
  where deleted_at is null;

-- ── Admin audit trail ──────────────────────────────────────────────
-- Append-only record of every admin change, with before/after state.
create table if not exists public.admin_audit (
  id         uuid primary key default gen_random_uuid(),
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

alter table public.admin_audit enable row level security;

-- Revoke the roles a hosted provider may have granted. Wrapped because those
-- roles only exist on some providers — on a plain Postgres they don't, and the
-- statement would abort the migration.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on public.admin_audit from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on public.admin_audit from authenticated';
  end if;
end $$;

-- ── History protection ─────────────────────────────────────────────
-- These fire for the service role too, so an application bug cannot erase a
-- product or rewrite the audit trail. This is the backstop behind the
-- application-level rules, not a duplicate of them.

create or replace function public.h365_block_operation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'Blocked: % on % is not permitted. Products are soft-deleted (set deleted_at); audit rows are append-only.',
    tg_op, tg_table_name;
end;
$$;

drop trigger if exists products_no_hard_delete on public.products;
create trigger products_no_hard_delete
  before delete on public.products
  for each row execute function public.h365_block_operation();

drop trigger if exists admin_audit_append_only on public.admin_audit;
create trigger admin_audit_append_only
  before update or delete on public.admin_audit
  for each row execute function public.h365_block_operation();

-- Orders are a financial record; they may change status but never disappear.
drop trigger if exists orders_no_hard_delete on public.orders;
create trigger orders_no_hard_delete
  before delete on public.orders
  for each row execute function public.h365_block_operation();
