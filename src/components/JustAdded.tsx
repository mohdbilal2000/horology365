"use client";

import { Carousel } from "@/components/ui/Carousel";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { displayBrandName } from "@/lib/catalog";
import { useAdminProducts } from "@/lib/store/catalog";

/**
 * Everything published from /admin, newest first. The brand bays only cover
 * seeded brands, so this is where a product from a brand-new brand shows up —
 * and it's the fastest confirmation that an admin add went live.
 */
export function JustAdded() {
  const products = useAdminProducts();
  if (products.length === 0) return null;

  return (
    <section className="band-light section-y" aria-label="Just added">
      <div className="shell">
        <SectionHeader
          label="New In"
          title="Just Added"
          description="The latest watches added to the showroom."
        />
        <Reveal>
          <Carousel label="Recently added watches" tone="light">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                brandName={displayBrandName(product)}
                fixedWidth
              />
            ))}
          </Carousel>
        </Reveal>
      </div>
    </section>
  );
}
