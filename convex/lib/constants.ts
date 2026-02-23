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

/** Maximum characters for customer notes */
export const MAX_NOTES_LENGTH = 500;

// ============================================
// FILE UPLOADS
// ============================================

/** Maximum file size for uploads (20MB) */
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/** Allowed image file types */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Allowed document file types */
export const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;

/** File magic bytes for content-type validation */
export const FILE_MAGIC_BYTES = {
  "image/jpeg": [
    [0xFF, 0xD8, 0xFF], // JPEG/JFIF
  ],
  "image/png": [
    [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
  ],
  "image/webp": [
    [0x52, 0x49, 0x46, 0x46], // RIFF (WebP container)
  ],
  "application/pdf": [
    [0x25, 0x50, 0x44, 0x46], // %PDF
  ],
} as const;

// ============================================
// DISPLAY & FORMATTING
// ============================================

/** Currency symbol for display */
export const CURRENCY_SYMBOL = "₹";

/** Locale for number formatting */
export const LOCALE = "en-IN";

// ============================================
// WHOLESALE CONTACT
// ============================================

/** WhatsApp contact for bulk pricing negotiation */
export const WHATSAPP_BULK_PRICING_CONTACT = "+91 7458 816 343";

/** WhatsApp URL for bulk pricing inquiries */
export const WHATSAPP_BULK_PRICING_URL = "https://wa.me/917458816343?text=Hi,%20I%27m%20interested%20in%20bulk%20purchase.";

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
