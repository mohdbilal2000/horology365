import { NextResponse } from "next/server";
import { MAINTENANCE_MODE, maintenanceResponse } from "@/lib/maintenance";
import { blobConfigured } from "@/lib/data/blobClient";
import { productRows } from "@/lib/seedCatalog";
import { restoreCatalogueEntries } from "@/lib/data/catalogue";
import { normaliseIncomingProduct } from "@/lib/data/backup";
import { revalidateCatalog } from "@/lib/revalidateCatalog";

/**
 * Admin-gated equivalent of `npm run seed` — loads the starter catalogue into
 * a deployed environment without needing to run a script locally.
 *
 * DISABLED as of the domain cutover: the live store now holds the client's
 * real products, so POST below refuses instead of running this. The
 * insert-only implementation is kept intact (not deleted, not commented out)
 * because tests/data-safety.test.ts requires the seed route's own source to
 * go through restoreCatalogueEntries() rather than writing products
 * directly — see that test's comment on why it must never be loosened.
 * `npm run seed` (fresh/local project) is unaffected — it calls
 * restoreCatalogueEntries() directly and never goes through this route.
 *
 * PRODUCTS ARE ONLY EVER INSERTED, via the exact same insert-only path
 * `/api/admin/restore` uses. An existing product (matched by slug) is never
 * rewritten, so seeding cannot undo the owner's edits or replace images he
 * uploaded. This used to upsert products, which is how his products and
 * photos were lost. Do not change it back.
 */
export const maxDuration = 60;

async function seedStarterCatalogue(): Promise<NextResponse> {
  // Maintenance mode — see src/lib/maintenance.ts.
  if (MAINTENANCE_MODE) return maintenanceResponse();

  if (!blobConfigured()) {
    return NextResponse.json(
      { error: "Product storage isn't configured (BLOB_READ_WRITE_TOKEN missing)." },
      { status: 503 },
    );
  }

  try {
    const rows = productRows();
    const entries = await Promise.all(rows.map((r) => normaliseIncomingProduct(r)));
    const { restored, skipped } = await restoreCatalogueEntries(entries);

    revalidateCatalog();
    return NextResponse.json({
      ok: true,
      seeded: { productsInserted: restored, productsSkipped: skipped },
    });
  } catch (err) {
    console.error("[admin/seed] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Seed failed." },
      { status: 500 },
    );
  }
}

export async function POST(): Promise<NextResponse> {
  if (MAINTENANCE_MODE) return maintenanceResponse();
  void seedStarterCatalogue; // kept intact for a future fresh deployment; not called on this store
  return NextResponse.json(
    { error: "Loading the starter catalogue is disabled on this store." },
    { status: 410 },
  );
}
