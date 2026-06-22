import { VideoHero, type HeroSlide } from "@/components/VideoHero";
import { TrustStrip } from "@/components/TrustStrip";
import { BrandLogoWall } from "@/components/BrandLogoWall";
import { BrandBay } from "@/components/BrandBay";
import { CategoryBlock } from "@/components/CategoryBlock";
import { VideoWall } from "@/components/VideoWall";
import { OfferBand } from "@/components/OfferBand";
import { DropCarousel } from "@/components/DropCarousel";
import { ReviewsSection } from "@/components/ReviewCard";
import {
  activeBanners,
  activeBrands,
  categories,
  getBrandBySlug,
  getProductBySlug,
  getProductsByBrand,
  preorderProducts,
  videoProducts,
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
      <TrustStrip />
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

      <CategoryBlock categories={categories} />
      <VideoWall products={videoProducts} />
      <OfferBand offers={offers} />
      <DropCarousel products={preorderProducts} />
      <ReviewsSection reviews={reviews} />
    </>
  );
}
