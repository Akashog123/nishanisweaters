/**
 * Product-related constants
 * Extracted from products.ts to avoid magic numbers
 */

// Pagination defaults
export const DEFAULT_PRODUCTS_LIMIT = 20;
export const DEFAULT_ADMIN_PRODUCTS_LIMIT = 10;
export const DEFAULT_FEATURED_LIMIT = 8;
export const DEFAULT_BESTSELLER_LIMIT = 8;
export const DEFAULT_LOW_STOCK_LIMIT = 50;
export const DEFAULT_SEARCH_LIMIT = 20;

// Price bucket boundaries for indexed filtering
export const PRICE_BUCKETS = {
  BUCKET_1_MAX: 1000,
  BUCKET_2_MAX: 2500,
  BUCKET_3_MAX: 5000,
  BUCKET_4_MAX: 10000,
} as const;

// Size ordering for logical sorting
export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Free Size"] as const;

// Default price range fallbacks
export const DEFAULT_MIN_PRICE = 0;
export const DEFAULT_MAX_PRICE = 10000;
