import { VideoProductCard } from "@/components/VideoProductCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Reveal } from "@/components/ui/Reveal";
import { getBrandBySlug } from "@/lib/mock/brands";
import type { Product } from "@/lib/types";

interface VideoWallProps {
  products: Product[];
}

/** Grid of muted autoplay watch videos; tap → product. */
export function VideoWall({ products }: VideoWallProps) {
  if (products.length === 0) return null;

  return (
    <section className="band-dark py-14 sm:py-20">
      <div className="shell">
        <SectionHeader label="In Motion" title="The Video Wall" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {products.map((product, i) => (
            <Reveal key={product.id} delay={(i % 4) * 60}>
              <VideoProductCard
                product={product}
                brandName={getBrandBySlug(product.brandSlug)?.name ?? ""}
              />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
