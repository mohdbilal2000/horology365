import "server-only";
import { query } from "@/lib/db/client";

/**
 * Inserts a brand row if this slug hasn't been seen before, so the admin's
 * "+ Add a new brand" flow doesn't hit the products.brand_slug FK. Shared by
 * the create and edit product routes.
 *
 * `on conflict do nothing` makes this safe under concurrency: two product
 * creates for the same new brand can't race into a duplicate-key error, and an
 * existing brand is never overwritten.
 */
export async function ensureBrandExists(brandSlug: string): Promise<void> {
  const name = brandSlug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  await query(
    `insert into brands (slug, name, is_active, sort_order)
     values ($1, $2, true, 999)
     on conflict (slug) do nothing`,
    [brandSlug, name],
  );
}
