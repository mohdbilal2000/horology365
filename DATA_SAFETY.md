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

## The second incident: the database itself disappeared

Everything above stops the *app* from destroying data. It did nothing the day
the *database* went away — a Postgres/Neon project lost outside the app
entirely (a dashboard action, a storage integration disconnected, an account
issue), which no soft-delete flag or trigger can see, because there is no row
left to protect.

So the storage layer moved off a database entirely, onto Vercel Blob (see
[`DATABASE.md`](./DATABASE.md)). This removes the failure rather than adding a
fifth layer of defense against it: there is no bandwidth allowance to exceed,
no connection to drop, and every write is an independently-addressed,
immutable object rather than a row inside one project that can be deleted
whole. A nightly snapshot (`/api/cron/backup`) still lands somewhere else
entirely — an inbox, not this Vercel account — for the one thing versioned
storage in the same account still can't cover: that account itself being lost.

## Enforced in four layers

Each of these is sufficient on its own; all four are in place so that one
mistake cannot undo the guarantee.

1. **Seed and restore** — both insert-only, through the exact same code path
   (`restoreCatalogueEntries` in `catalogue.ts`). An existing product (by
   slug) is never rewritten.
2. **API** — `DELETE` soft-deletes and returns the record; `POST` restores it.
   Reads filter on `deleted_at` so removed products leave the shop.
3. **Audit** — every create, update, stock change, delete and restore is
   recorded as its own file under `store/audit/`, with before/after state.
4. **Storage** — `catalogue.ts` contains no code path that removes an entry
   from the stored array, and `blobClient.ts` has no delete function at all —
   not "a delete that's disabled," an actual absence of the capability.

## This cannot regress

**`tests/data-safety.test.ts`** reads the source and fails on a splice/shrink
against the stored array, a DELETE route that doesn't soft-delete, a missing
restore handler, a seed or restore that doesn't go through the insert-only
path, or a database creeping back into the runtime code path. **`tests/catalogue.test.ts`**
goes further and exercises the real code against a stub Blob server — a
product genuinely survives a remove/restore round trip with its photo intact,
a stale backup row is genuinely skipped rather than overwriting a newer edit,
and every write genuinely produces a new, untouched history file. CI
(`.github/workflows/verify.yml`) runs both on every push and pull request.

> If one of these tests fails, **do not loosen the test.** It is reporting that
> your change can destroy live customer data.

## Getting a copy onto your own computer

`/admin/backup` downloads everything — every product (including removed
ones), every order, the full change log — as one JSON file. `/api/admin/restore`
puts back anything that's missing from a file like that; it never overwrites
what's already there, so running it is always safe.

Editing a single product also offers **"Download this product"**
(`/api/admin/products/:id/export`) — the same file shape, scoped to one
product, for "I just finished this one, save a copy before I touch anything
else." Either file restores through the same `/admin/backup` restore panel.
A backup taken before the Blob migration (with photos embedded as base64) also
restores cleanly — each embedded photo is uploaded to Blob on the way in and
replaced with its real URL, so restoring an old backup is also how a product
finishes moving off an embedded photo.
