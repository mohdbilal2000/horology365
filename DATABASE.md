# Database

The app talks to **PostgreSQL over the standard wire protocol** (`pg`). There is
no vendor SDK anywhere in the code, so the database is one environment variable
away from being moved.

```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

That works unchanged on Supabase, Neon, Railway, AWS RDS, DigitalOcean, or a
machine you run yourself. The schema and its migrations live in this repo, under
`db/` — that, not the hosting, is where control actually lives.

## Setting it up

```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/migrations/20260823-product-data-safety.sql
npm run seed        # loads the static catalogue; never overwrites existing products
```

## Environment

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_URL` | Connection string. Without it the site serves the static catalogue and checkout still completes. | _unset_ |
| `DATABASE_SSL` | `require` (verify), `no-verify` (encrypt, don't verify), `disable` | auto: TLS for remote hosts, off for localhost |
| `DATABASE_POOL_MAX` | Connections **per running instance** | `3` |

Most managed providers present a certificate Node won't verify out of the box,
so `no-verify` is the usual production setting — traffic is still encrypted.

## Use a pooler in production

This is the one thing that bites people when moving off a REST-based client.

Serverless functions don't share a connection pool: every warm instance opens
its own. Postgres has a hard connection ceiling (small managed instances allow
around 60), so a traffic spike exhausts connections long before the database is
actually busy, and requests start failing with "too many clients".

**Point `DATABASE_URL` at a transaction-mode pooler**, not the direct port:

- **Supabase** — use the *Connection pooling* string (port `6543`), not `5432`
- **Neon** — use the `-pooler` host
- **Self-hosted** — run PgBouncer in `transaction` mode

`DATABASE_POOL_MAX` is deliberately small for the same reason. Raise it only if
you move to a long-lived server (one process, not many lambdas).

## Uptime and backups

Whoever hosts Postgres owns uptime. Managed providers give you automatic
failover and point-in-time recovery; a server you run gives you neither until
you build them. If you do self-host, budget for:

- automated backups **with a restore you have actually tested** — an untested
  backup is not a backup
- a connection pooler (above)
- TLS, monitoring, disk-space alerts, and minor-version patching

Moving is a connection-string change, so this decision is reversible. Nothing in
the application code has to change.

## Data safety

Independent of where Postgres runs, the schema enforces:

- products are **soft-deleted** (`deleted_at`), never removed
- seeding can only **insert** products, never overwrite one
- `admin_audit` is **append-only**
- triggers reject `DELETE` on `products` and `orders`, and `UPDATE`/`DELETE` on
  `admin_audit` — including for the application's own role

See [`DATA_SAFETY.md`](./DATA_SAFETY.md). `npm run test:db` verifies all of it
against a real PostgreSQL, and CI runs it on every push.
