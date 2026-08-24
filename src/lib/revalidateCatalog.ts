import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Invalidates every cached storefront page that reads product/brand data, so
 * an admin write shows up immediately instead of waiting for the page.tsx
 * `revalidate` window. Called after every successful write in
 * src/app/api/admin/products/**.
 *
 * The home page is purged with the "layout" form rather than revalidatePath("/").
 * On Vercel the root page's cache entry is keyed `/index`, and the plain call
 * was observed not to clear it: after the owner added products, every brand and
 * category page updated while the home page kept advertising watches he had
 * already removed — including links that 404ed. Purging the root layout clears
 * the tree, which also covers any storefront page added later that this
 * function has not been taught about.
 *
 * Specific paths are revalidated in addition to the `[slug]` patterns: the
 * pattern form covers pages generated from generateStaticParams, the exact
 * path is what a newly created brand or category page needs.
 */
export function revalidateCatalog(target?: {
  brandSlug?: string;
  categorySlug?: string;
}): void {
  revalidatePath("/", "layout");
  revalidatePath("/");

  if (target?.brandSlug) revalidatePath(`/brand/${target.brandSlug}`);
  if (target?.categorySlug) revalidatePath(`/category/${target.categorySlug}`);

  revalidatePath("/category/[slug]", "page");
  revalidatePath("/brand/[slug]", "page");
  revalidatePath("/product/[slug]", "page");
}
