/**
 * Regenerates src/lib/db/setupSql.ts from the .sql files under db/.
 * Run after editing either file:  npm run gen:setup-sql
 */
import { readFileSync, writeFileSync } from "node:fs";

const schema = readFileSync("db/schema.sql", "utf8");
const migration = readFileSync("db/migrations/20260823-product-data-safety.sql", "utf8");
const body = `${schema}\n${migration}`;
const escaped = body.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

const header = readFileSync("src/lib/db/setupSql.ts", "utf8").split("export const SETUP_SQL")[0];
writeFileSync("src/lib/db/setupSql.ts", `${header}export const SETUP_SQL = \`${escaped}\`;\n`);
console.log(`setupSql.ts regenerated from db/ (${body.length} chars)`);
