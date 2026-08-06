"use client";

import { SectionHeader } from "@/components/SectionHeader";
import { ProductGrid } from "@/components/ProductGrid";
import { useAdminProducts } from "@/lib/liveCatalog";

/**
 * Homepage rail for products freshly published from the admin. Renders
 * nothing until there's at least one, so the page is unchanged for stores
 * that haven't added inventory yet.
 */
export function JustInSection() {
  const adminProducts = useAdminProducts();
  if (adminProducts.length === 0) return null;

  return (
    <section className="band-light section-y">
      <div className="shell">
        <SectionHeader
          label="Fresh Stock"
          title="Just In"
          description="The latest pieces to land in the showroom — added moments ago."
        />
        <ProductGrid products={adminProducts.slice(0, 8)} />
      </div>
    </section>
  );
}
