import "server-only";
import {
  getSupabaseAnon,
  isSupabaseConfigured,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/server";
import { products as seedProducts } from "@/lib/mock/products";

/**
 * Is the storefront serving real, admin-managed data, or has it silently
 * dropped back to the static demo catalogue?
 *
 * `getAllProducts()` falls back to the seed array whenever Supabase is
 * unconfigured or the query errors. That fallback is deliberate — a database
 * blip shouldn't take the shop offline — but it is indistinguishable from the
 * shop's own day-one content, so an outage reads to the people running the
 * store as "the site reverted and our uploads are gone". This reports which
 * of the two is actually happening, so nobody has to guess.
 */

export type CatalogSource = "database" | "seed-fallback";

export interface CatalogStatus {
  /** "database" = live admin data. "seed-fallback" = static demo catalogue. */
  source: CatalogSource;
  /** Are the public Supabase URL + anon key present on this deployment? */
  configured: boolean;
  /** Is the service-role key present (required for every admin write)? */
  adminConfigured: boolean;
  /** Did the catalogue query actually succeed? */
  reachable: boolean;
  /** Product rows currently in the database, or null if it can't be read. */
  databaseProductCount: number | null;
  /** Products in the built-in demo catalogue, shown while falling back. */
  seedProductCount: number;
  /** Why the fallback kicked in, if it did. Never contains credentials. */
  error: string | null;
}

export async function getCatalogStatus(): Promise<CatalogStatus> {
  const adminConfigured = isSupabaseAdminConfigured();
  const seedProductCount = seedProducts.length;

  if (!isSupabaseConfigured()) {
    return {
      source: "seed-fallback",
      configured: false,
      adminConfigured,
      reachable: false,
      databaseProductCount: null,
      seedProductCount,
      error:
        "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set on this deployment.",
    };
  }

  // head:true — asks only for the row count, downloads no product data.
  const { count, error } = await getSupabaseAnon()!
    .from("products")
    .select("id", { count: "exact", head: true });

  if (error) {
    return {
      source: "seed-fallback",
      configured: true,
      adminConfigured,
      reachable: false,
      databaseProductCount: null,
      seedProductCount,
      error: error.message,
    };
  }

  return {
    source: "database",
    configured: true,
    adminConfigured,
    reachable: true,
    databaseProductCount: count ?? 0,
    seedProductCount,
    error: null,
  };
}
