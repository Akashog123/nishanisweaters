/**
 * Application Constants
 *
 * Re-exports shared business constants from convex/lib/constants.ts
 * to ensure frontend and backend stay in sync.
 *
 * IMPORTANT: The source of truth is convex/lib/constants.ts
 * This file provides frontend-specific additions and re-exports.
 */

// Re-export all shared constants from Convex backend
export {
  // Pricing & Tax
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_COST,
  // Pagination
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  ADMIN_PAGE_SIZE,
  // Timeouts & Expiry
  GUEST_CART_EXPIRY_MS,
  SESSION_TIMEOUT_MS,
  // Validation Limits
  MAX_CART_ITEM_QUANTITY,
  MIN_WHOLESALE_ORDER_QUANTITY,
  MAX_NOTES_LENGTH,
  // Wholesale
  WHOLESALE_MIN_ORDER_AMOUNTS,
  WHOLESALE_DISCOUNTS,
  // File Uploads
  MAX_FILE_SIZE_BYTES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  // Display & Formatting
  CURRENCY_SYMBOL,
  LOCALE,
  // Helper Functions
  calculateShipping,
  calculateTax,
  calculateTotal,
} from "../../convex/lib/constants";

// ============================================
// FRONTEND-SPECIFIC CONSTANTS
// ============================================

/** Date format options for display */
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

/** DateTime format options for display */
export const DATETIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

// ============================================
// FRONTEND HELPER FUNCTIONS
// ============================================

// Import for use in formatCurrency
import { CURRENCY_SYMBOL, LOCALE } from "../../convex/lib/constants";

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return `${CURRENCY_SYMBOL}${amount.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date;
  return d.toLocaleDateString(LOCALE, DATE_FORMAT_OPTIONS);
}

/**
 * Format datetime for display
 */
export function formatDateTime(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date;
  return d.toLocaleDateString(LOCALE, DATETIME_FORMAT_OPTIONS);
}
