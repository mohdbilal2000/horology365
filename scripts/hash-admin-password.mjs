#!/usr/bin/env node
/**
 * Generates an ADMIN_PASSWORD_HASH value so the admin password never has to be
 * stored in plaintext in a .env file or a hosting dashboard.
 *
 *   npm run admin:hash -- 'my new password'
 *
 * Paste the printed line into your environment, then remove ADMIN_PASSWORD.
 */
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error("Usage: npm run admin:hash -- 'your password'");
  process.exit(1);
}
if (password.length < 10) {
  console.error("Refusing to hash a password shorter than 10 characters.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32);
console.log(`ADMIN_PASSWORD_HASH=scrypt$${salt.toString("hex")}$${hash.toString("hex")}`);
