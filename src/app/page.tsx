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
import { activeBanners, offers, reviews } from "@/lib/mock";
import { getAllCategories } from "@/lib/data/categories";
import { getActiveBrands, getBrandBySlug } from "@/lib/data/brands";
import {
  getProductBySlug,
  getProductsByBrand,
  getPreorderProducts,
  getBestSellers,
} from "@/lib/data/products";

export default async function HomePage() {
  const [categories, activeBrands, preorderProducts, bestSellers] = await Promise.all([
    getAllCategories(),
    getActiveBrands(),
    getPreorderProducts(),
    getBestSellers(),
  ]);

  const heroSlides: HeroSlide[] = [];
  for (const banner of activeBanners) {
    const product = await getProductBySlug(banner.productSlug);
    if (!product) continue;
    const brand = await getBrandBySlug(product.brandSlug);
    heroSlides.push({ banner, product, brandName: brand?.name ?? "" });
  }

  const brandBays = await Promise.all(
    activeBrands.map(async (brand) => ({
      brand,
      products: await getProductsByBrand(brand.slug),
    })),
  );

  return (
    <>
      <VideoHero slides={heroSlides} />
      <BrandLogoWall brands={activeBrands} />

      {/* One bay per active brand, dark / light bands alternating. */}
      {brandBays.map(({ brand, products }, i) => (
        <BrandBay
          key={brand.id}
          brand={brand}
          products={products}
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
