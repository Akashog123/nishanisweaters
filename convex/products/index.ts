/**
 * Products Module Index
 *
 * This file maintains backwards compatibility by re-exporting all functions
 * from the split modules. Existing imports from "convex/products" will continue
 * to work without any code changes.
 */

// Re-export all query functions
export {
  listProducts,
  getFilterOptions,
  getProductBySlug,
  getProductById,
  searchProducts,
  getFeaturedProducts,
  getBestsellerProducts,
  getLowStockProducts,
  listProductsForAdmin,
} from "./queries";

// Re-export all mutation functions
export {
  createProduct,
  updateProduct,
  deleteProduct,
} from "./mutations";

// Re-export inventory management functions
export {
  updateStockQuantity,
} from "./inventory";

// Re-export analytics/stats functions
export {
  getProductStats,
} from "./stats";

// Re-export helper functions (if needed by consumers)
export {
  calculatePriceBucket,
  extractVariantAttributes,
  canViewWholesalePrices,
  sanitizeProductPricing,
} from "./helpers";
