/**
 * Writes a full backup to a file on your own machine.
 *
 *   BLOB_READ_WRITE_TOKEN='...' npm run db:backup
 *
 * Same contents as Admin → Backup, and restored the same way. Having it as a
 * command means it can be run before any risky change, or on a schedule.
 */
import { writeFileSync } from "node:fs";
import { buildBackup } from "../src/lib/data/backup";

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Set BLOB_READ_WRITE_TOKEN first, e.g.");
  console.error("  BLOB_READ_WRITE_TOKEN='...' npm run db:backup");
  process.exit(1);
}

async function main() {
  const backup = await buildBackup();
  const file = process.argv[2] ?? `horology365-backup-${backup.takenAt.slice(0, 10)}.json`;
  writeFileSync(file, JSON.stringify(backup, null, 2));
  console.log(
    `Saved ${file}\n  ${backup.counts.products} products, ` +
      `${backup.counts.orders} orders, ${backup.counts.auditEntries} log entries`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
