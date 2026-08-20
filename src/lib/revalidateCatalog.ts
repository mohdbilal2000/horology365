import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Invalidates every cached storefront page that reads product/brand data, so
 * an admin write (create/adjust stock/delete) shows up immediately instead
 * of waiting for the page.tsx `revalidate` window to elapse. Called after
 * every successful write in src/app/api/admin/products/**.
 */
export function revalidateCatalog(): void {
  revalidatePath("/");
  revalidatePath("/category/[slug]", "page");
  revalidatePath("/brand/[slug]", "page");
  revalidatePath("/product/[slug]", "page");
}
