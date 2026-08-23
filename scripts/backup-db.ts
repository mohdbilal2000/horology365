/**
 * Writes a full backup to a file on your own machine.
 *
 *   DATABASE_URL='postgres://...' npm run db:backup
 *
 * Same contents as Admin → Backup, and restored the same way. Having it as a
 * command means it can be run before any risky change, or on a schedule.
 */
import { writeFileSync } from "node:fs";
import { Pool } from "pg";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.error("Set DATABASE_URL first, e.g.");
  console.error("  DATABASE_URL='postgres://...' npm run db:backup");
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(url);
const pool = new Pool({
  connectionString: url,
  ssl: process.env.DATABASE_SSL === "disable" || isLocal ? false : { rejectUnauthorized: false },
});

async function main() {
  const [products, orders, audit] = await Promise.all([
    pool.query("select * from products order by created_at"),
    pool.query("select * from orders order by created_at"),
    pool.query("select * from admin_audit order by at"),
  ]);

  const backup = {
    version: 1,
    takenAt: new Date().toISOString(),
    counts: {
      products: products.rowCount ?? 0,
      orders: orders.rowCount ?? 0,
      auditEntries: audit.rowCount ?? 0,
    },
    products: products.rows,
    orders: orders.rows,
    audit: audit.rows,
  };

  const file =
    process.argv[2] ?? `horology365-backup-${backup.takenAt.slice(0, 10)}.json`;
  writeFileSync(file, JSON.stringify(backup, null, 2));

  console.log(
    `Saved ${file}\n  ${backup.counts.products} products, ` +
      `${backup.counts.orders} orders, ${backup.counts.auditEntries} log entries`,
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
