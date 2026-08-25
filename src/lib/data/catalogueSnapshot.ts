import type { Product } from "@/lib/types";
import snapshot from "./catalogueSnapshot.json";

/**
 * The owner's real catalogue, shipped with the site.
 *
 * When the database could not be reached, the storefront fell back to the
 * built-in demo catalogue — so customers were shown 28 stock-photo watches at
 * invented prices, and several tried to buy them. "None of my watches are
 * listed" is exactly what the owner reported. Serving someone else's demo
 * inventory on a real shop is worse than serving nothing at all.
 *
 * This is his own stock instead: same titles, descriptions, prices and photos,
 * with the photos as real files rather than embedded in the page. It is a
 * floor, not a source of truth — the database wins whenever it answers.
 *
 * Regenerate from a backup with `npm run snapshot:from-backup <file.json>`.
 */
export const CATALOGUE_SNAPSHOT = snapshot as unknown as Product[];

export const SNAPSHOT_TAKEN_AT = "2026-08-24T12:35:00.000Z";
