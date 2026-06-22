import { Carousel } from "@/components/ui/Carousel";
import { ProductCard } from "@/components/ProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { getBrandBySlug } from "@/lib/mock/brands";
import type { Product } from "@/lib/types";

interface DropCarouselProps {
  products: Product[];
}

/** This Week's Drop — pre-order carousel on a dark band. */
export function DropCarousel({ products }: DropCarouselProps) {
  if (products.length === 0) return null;

  return (
    <section id="weekly-drop" className="band-light py-14 sm:py-20">
      <div className="shell">
        <SectionHeader
          label="Pre-order Now"
          title="This Week's Drop"
          viewAllHref="/category/mens-watches"
          viewAllLabel="All pre-orders"
        />
        <Reveal>
          <Carousel label="This week's pre-order drop" tone="light">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                brandName={getBrandBySlug(product.brandSlug)?.name ?? ""}
                fixedWidth
              />
            ))}
          </Carousel>
        </Reveal>
      </div>
    </section>
  );
}
