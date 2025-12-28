/**
 * Shared Business Constants
 *
 * Single source of truth for business configuration used across
 * both Convex backend and React frontend.
 *
 * These values are exported to the frontend via src/lib/constants.ts
 */

// ============================================
// PRICING & TAX
// ============================================

/** GST tax rate (18% for India) */
export const TAX_RATE = 0.18;

/** Minimum order amount for free shipping (in INR) */
export const FREE_SHIPPING_THRESHOLD = 1000;

/** Standard shipping cost when below threshold (in INR) */
export const SHIPPING_COST = 99;

// ============================================
// PAGINATION
// ============================================

/** Default number of items per page */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum items per page */
export const MAX_PAGE_SIZE = 100;

/** Admin list default page size */
export const ADMIN_PAGE_SIZE = 50;

// ============================================
// TIMEOUTS & EXPIRY
// ============================================

/** Guest cart expiry time in milliseconds (7 days) */
export const GUEST_CART_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

/** Session timeout for idle users (30 minutes) */
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

// ============================================
// VALIDATION LIMITS
// ============================================

/** Maximum quantity per item in cart */
export const MAX_CART_ITEM_QUANTITY = 100;

/** Minimum order quantity for wholesale */
export const MIN_WHOLESALE_ORDER_QUANTITY = 10;

/** Minimum order amount for wholesale tiers (in INR) */
export const WHOLESALE_MIN_ORDER_AMOUNTS = {
  tier1: 10000,  // Starter tier
  tier2: 50000,  // Growth tier
  tier3: 100000, // Enterprise tier
} as const;

/** Wholesale tier discount percentages */
export const WHOLESALE_DISCOUNTS = {
  tier1: 0.15, // 15% discount
  tier2: 0.22, // 22% discount
  tier3: 0.30, // 30% discount
} as const;

/** Maximum characters for customer notes */
export const MAX_NOTES_LENGTH = 500;

// ============================================
// FILE UPLOADS
// ============================================

/** Maximum file size for uploads (5MB) */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Allowed image file types */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Allowed document file types */
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

// ============================================
// DISPLAY & FORMATTING
// ============================================

/** Currency symbol for display */
export const CURRENCY_SYMBOL = "₹";

/** Locale for number formatting */
export const LOCALE = "en-IN";

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate shipping cost based on subtotal
 */
export function calculateShipping(subtotal: number): number {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
}

/**
 * Calculate tax amount
 */
export function calculateTax(subtotal: number): number {
  return subtotal * TAX_RATE;
}

/**
 * Calculate order total
 */
export function calculateTotal(subtotal: number): number {
  return subtotal + calculateShipping(subtotal) + calculateTax(subtotal);
}
