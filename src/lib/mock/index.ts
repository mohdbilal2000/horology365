/**
 * Single import surface for the mock-data layer.
 * In Phase 2, this module is replaced by typed Supabase queries with the
 * same function signatures, so components never change.
 */
export {
  brands,
  activeBrands,
  getBrandBySlug,
} from "./brands";

export { categories, getCategoryBySlug } from "./categories";

export {
  products,
  featuredProducts,
  preorderProducts,
  videoProducts,
  bestSellers,
  newArrivals,
  getProductBySlug,
  getProductsByBrand,
  getProductsByCategory,
  getRelatedProducts,
  searchProducts,
} from "./products";

export { banners, activeBanners } from "./banners";
export { offers } from "./offers";
export { reviews } from "./reviews";
