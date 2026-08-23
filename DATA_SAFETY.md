# Product data safety

**A product the store owner saves is his. Nothing removes it but him.**

This document exists because that was not true once: products entered by hand,
and photos uploaded for them, were lost. What follows is what was wrong, what
changed, and why it cannot happen again.

## What went wrong

Two independent paths could destroy the owner's work.

**1. Re-seeding overwrote live products.** `npm run seed` and
`POST /api/admin/seed` upserted every product from the code's mock catalogue
(`src/lib/mock/products.ts`) onto the live table, keyed on `slug`. Any product
the owner had edited — a replaced photo, a corrected price — was silently
reverted to the mock values the next time the seed ran. This is the most likely
cause of the incident: the seeded products carry the same slugs the owner was
editing.

**2. Removing a product destroyed the row.** `DELETE /api/admin/products/:id`
called `supabase.from("products").delete()`. The row was gone, along with every
image attached to it, with no undo and no record that it had existed.

## What changed

| | Before | Now |
| --- | --- | --- |
| Seeding a product that already exists | Overwrote it | **Skipped entirely** (`ignoreDuplicates: true`) |
| Removing a product | Row destroyed | **`deleted_at` stamped**; row and images kept |
| Getting it back | Impossible | **Restore** from `/admin/trash` |
| Record of the change | None | **Append-only audit trail** (`admin_audit`) |
| If application code is wrong | Data lost | **Postgres trigger rejects the delete** |

Categories and brands are still refreshed by the seed. They are code-managed
configuration, not the owner's content — no admin-entered data lives in them.

## Enforced in four layers

Each of these is sufficient on its own; all four are in place so that one
mistake cannot undo the guarantee.

1. **Seed** — products are insert-only. An existing row is never rewritten.
2. **API** — `DELETE` soft-deletes and returns the record; `POST` restores it.
   Reads filter `deleted_at is null` so removed products leave the shop.
3. **Audit** — every create, update, stock change, delete and restore is
   appended to `admin_audit` with before/after state.
4. **Database** — triggers reject `DELETE` on `products` and `orders`, and
   `UPDATE`/`DELETE` on `admin_audit`. These fire for the service-role key too,
   so a bug in the app cannot get past them.

## This cannot regress

Two suites run on every push:

- **`tests/data-safety.test.ts`** — reads the source and fails on a `.delete()`
  against products, a DELETE route that doesn't soft-delete, a missing restore
  handler, a seed without `ignoreDuplicates`, an unfiltered read, or a removed
  database trigger.
- **`tests/product-routes.test.ts`** — executes the real route handlers against
  a stand-in PostgREST and asserts the actual HTTP call. It proves removal sends
  `PATCH ?deleted_at=is.null` and never a `DELETE`, that restore clears
  `deleted_at` and the owner's image survives the round trip, that the shop
  query excludes removed products, and that the seed sends
  `Prefer: resolution=ignore-duplicates` rather than `merge-duplicates`.

Both original bugs were re-introduced deliberately to confirm the suites go red
for each — the route test reports the difference at the wire level
(`resolution=merge-duplicates` vs `ignore-duplicates`). CI (`.github/workflows/verify.yml`) runs it on every push and pull
request.

> If one of these tests fails, **do not loosen the test.** It is reporting that
> your change can destroy live customer data.

## Applying this to an existing deployment

Run once, in the Supabase SQL editor:

```
supabase/migrations/20260823-product-data-safety.sql
```

It adds `products.deleted_at`, the `admin_audit` table, and the protection
triggers. It is safe to re-run. Fresh projects get all of it from
`supabase/schema.sql`.

Verify afterwards:

```sql
-- should return one row
select column_name from information_schema.columns
where table_name = 'products' and column_name = 'deleted_at';

-- should return three triggers
select tgname from pg_trigger
where tgname in ('products_no_hard_delete','orders_no_hard_delete','admin_audit_append_only');
```
