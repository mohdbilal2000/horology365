import { VideoHero } from "@/components/VideoHero";
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
  getProductsByBrand,
  preorderProducts,
  videoProducts,
  offers,
  reviews,
} from "@/lib/mock";

export default function HomePage() {
  return (
    <>
      <VideoHero banners={activeBanners} />
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
