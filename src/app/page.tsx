import { VideoHero, type HeroSlide } from "@/components/VideoHero";
import { TrustStrip } from "@/components/TrustStrip";
import { BrandLogoWall } from "@/components/BrandLogoWall";
import { BrandBay } from "@/components/BrandBay";
import { CategoryBlock } from "@/components/CategoryBlock";
import { OfferBand } from "@/components/OfferBand";
import { DropCarousel } from "@/components/DropCarousel";
import { ReviewsSection } from "@/components/ReviewCard";
import { SectionHeader } from "@/components/SectionHeader";
import { ProductGrid } from "@/components/ProductGrid";
import {
  activeBanners,
  activeBrands,
  categories,
  getBrandBySlug,
  getProductBySlug,
  getProductsByBrand,
  preorderProducts,
  bestSellers,
  offers,
  reviews,
} from "@/lib/mock";

export default function HomePage() {
  const heroSlides: HeroSlide[] = activeBanners.flatMap((banner) => {
    const product = getProductBySlug(banner.productSlug);
    if (!product) return [];
    const brandName = getBrandBySlug(product.brandSlug)?.name ?? "";
    return [{ banner, product, brandName }];
  });

  return (
    <>
      <VideoHero slides={heroSlides} />
      <BrandLogoWall brands={activeBrands} />

      {/* One bay per active brand, dark / light bands alternating. */}
      {activeBrands.map((brand, i) => (
        <BrandBay
          key={brand.id}
          brand={brand}
          products={getProductsByBrand(brand.slug)}
          tone={i % 2 === 0 ? "dark" : "light"}
        />
      ))}

      {/* Best Sellers — a full grid of the most-loved watches. */}
      <section className="band-dark aurora grain relative overflow-hidden section-y">
        <div className="shell relative z-[2]">
          <SectionHeader
            label="Most Loved"
            title="Best Sellers"
            description="The watches our customers reach for first, ranked by demand."
            viewAllHref="/category/mens-watches"
            viewAllLabel="Shop all"
          />
          <ProductGrid products={bestSellers} />
        </div>
      </section>

      <CategoryBlock categories={categories} />
      <OfferBand offers={offers} />
      <DropCarousel products={preorderProducts} />
      <ReviewsSection reviews={reviews} limit={3} viewAllHref="/reviews" />
      <TrustStrip />
    </>
  );
}
