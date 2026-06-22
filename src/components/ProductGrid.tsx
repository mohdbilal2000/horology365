import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/ui/Reveal";
import { getBrandBySlug } from "@/lib/mock/brands";
import type { Product } from "@/lib/types";

interface ProductGridProps {
  products: Product[];
  /** Override brand name (e.g. on a brand page where it's constant). */
  brandName?: string;
}

export function ProductGrid({ products, brandName }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-c-60">
        No watches here yet — check back after the next drop.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {products.map((product, i) => (
        <Reveal key={product.id} delay={(i % 4) * 50} as="div">
          <ProductCard
            product={product}
            brandName={brandName ?? getBrandBySlug(product.brandSlug)?.name ?? ""}
          />
        </Reveal>
      ))}
    </div>
  );
}
