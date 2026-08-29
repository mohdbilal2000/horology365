# Storage

The app has no database. Products, orders and the admin audit trail live in
**Vercel Blob** — plain object storage, addressed over its REST API, hand-rolled
rather than the `@vercel/blob` SDK so the same code can be tested end to end
against a local stub server (see `tests/stubs/blob-server.ts`) instead of
mocked.

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

Get one from **Vercel → Storage → Create Database → Blob**, then copy the
token it generates. That's the entire setup — there's no schema to create and
no migration to run, because there's nothing to migrate.

## Why Blob instead of a database

This site's database was Neon-backed Postgres, twice. Both times, the failure
that actually cost data wasn't inside the application — it was the database
itself going away: a project deleted from the wrong dashboard, a storage
integration disconnected, a bandwidth allowance exceeded and the connection
refused for weeks with nothing surfacing it. Every code-level protection
(soft delete, triggers, an audit trail) only stops the app from destroying its
own data — none of it can stop the database disappearing out from under the app.

Blob removes that whole failure class rather than defending against it:

- No connection pool to exhaust, no bandwidth allowance to go over, nothing
  that silently stops answering under normal traffic.
- Every write is immutable and versioned by construction, not by a rule the
  code has to remember to follow. `src/lib/data/catalogue.ts` never overwrites
  a stored product — every admin write lands as a brand-new, timestamped
  history file (`store/catalogue/history/…`) before the small "current"
  pointer (`store/catalogue/latest.json`) is updated. "Restore" is not a
  separate mechanism bolted on afterward; it's the same storage model.
- Product photos are their own Blob objects (`store/images/…`), not bytes
  embedded in a row — the actual fix for "the database was heavy": a photo
  now lives once, as a real file, however many times the product around it
  gets edited.

## How it's organised

| Prefix | What | Overwritten? |
| --- | --- | --- |
| `store/catalogue/latest.json` | Current product array (small, just URLs + metadata) | Yes — the only mutable pointer for products |
| `store/catalogue/history/*.json` | Full catalogue snapshot after every write | Never |
| `store/orders/<id>/latest.json` | One order's current state | Yes, but only that one order — no two orders can ever race each other |
| `store/orders/<id>/history/*.json` | That order's state after every change | Never |
| `store/audit/*.json` | One admin action, one file | Never |
| `store/images/*` | Uploaded product photos | Never |
| `backups/*.json` | Nightly full-store snapshots (separate from the above — see the cron job) | Never |

Nothing in this codebase ever issues a delete against Blob. `src/lib/data/blobClient.ts`
has no delete function at all.

## Concurrency

Two admin edits landing at the same moment are resolved with an optimistic
retry (`withCatalogue` in `catalogue.ts`): each write records which version it
started from, and re-reads before committing — if another write landed in
between, it retries against the fresh state rather than clobbering it. At one
admin's normal traffic this is essentially never exercised, but it means a
double-click or two open tabs can't silently lose one of the changes.

## Checking a deployment

`GET /api/health` reports what's actually configured:

```json
{
  "status": "ok",
  "checks": {
    "storage":     { "ok": true, "detail": "connected · 45 live products" },
    "dataSafety":  { "ok": true, "detail": "soft delete only, no hard-delete code path · 312 catalogue version(s) retained" },
    "storageSize": { "ok": true, "detail": "41 MB total · 180 photo(s) · 312 catalogue version(s) · 96 order file(s)" },
    "backups":     { "ok": true, "detail": "…" }
  }
}
```

`storageSize` is what to check before moving to a new Vercel account — the
actual number, not a guess. Returns **503** when storage is unreachable and
**200** otherwise.

## Data safety

Independent of the code-level guarantees above:

- products are **soft-deleted** (`deleted_at`), never removed from the stored array
- seeding and restoring a backup are both **insert-only** — an existing
  product (by slug) is left exactly as it is
- the audit trail is **append-only** by construction — every entry is its own
  file, and there is no update or delete path in `adminAudit.ts`

See [`DATA_SAFETY.md`](./DATA_SAFETY.md). `tests/catalogue.test.ts` verifies
all of it against the real storage code (a local stub server standing in for
the Blob API — no mocking of this project's own functions), and CI runs it on
every push.

## Moving to a different Vercel account

Blob is per-project, so moving hosting means moving the data too:

1. In the new project: Storage → Create Database → Blob, set
   `BLOB_READ_WRITE_TOKEN`.
2. `npm run setup:prod -- "<new token>"` loads the starter catalogue
   (insert-only, safe to re-run).
3. Download a full backup from the old deployment's `/admin/backup`, then
   restore it on the new one — insert-only, so it can't overwrite anything
   even if run twice.
4. Check `/api/health` on the new deployment reads fully green before
   pointing the domain at it.
