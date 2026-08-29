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
 * Categories and brands need no seeding step at all: they're code-managed
 * configuration read straight from `src/lib/mock/` on every request (see
 * DATA_SAFETY.md), not stored data.
 *
 * PRODUCTS ARE ONLY EVER INSERTED, via the exact same insert-only path
 * `/api/admin/restore` uses. An existing product (matched by slug) is never
 * rewritten, so seeding cannot undo the owner's edits or replace images he
 * uploaded. This used to upsert products, which is how his products and
 * photos were lost. Do not change it back.
 */
export const maxDuration = 60;

export async function POST(): Promise<NextResponse> {
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
