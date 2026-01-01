/**
 * Shared Type Definitions and Validators
 *
 * Centralized type definitions to ensure consistency across the Convex backend.
 * This eliminates duplicate type definitions and provides a single source of truth.
 *
 * ARCHITECTURE DECISION:
 * - Validators are exported for use in Convex function args
 * - TypeScript types are exported for type annotations
 * - Constants arrays are exported for runtime validation/iteration
 */

import { v } from "convex/values";

// ============================================
// ORDER STATUS TYPES
// ============================================

/**
 * All possible order statuses in the order lifecycle.
 * Order: pending -> confirmed -> processing -> shipped -> delivered
 * Any state can transition to cancelled (except delivered)
 */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Convex validator for order status.
 * Use this in mutation/query args instead of inline v.union().
 */
export const orderStatusValidator = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("processing"),
  v.literal("shipped"),
  v.literal("delivered"),
  v.literal("cancelled")
);

// ============================================
// PAYMENT STATUS TYPES
// ============================================

/**
 * All possible payment statuses.
 * Includes refund-related states for complete lifecycle tracking.
 */
export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
  "partially_refunded",
  "disputed",
  "refund_pending",
  "refund_failed",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/**
 * Convex validator for payment status.
 */
export const paymentStatusValidator = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("failed"),
  v.literal("refunded"),
  v.literal("partially_refunded"),
  v.literal("disputed"),
  v.literal("refund_pending"),
  v.literal("refund_failed")
);

// ============================================
// DISPUTE STATUS TYPES
// ============================================

export const DISPUTE_STATUSES = [
  "created",
  "under_review",
  "action_required",
  "won",
  "lost",
  "closed",
] as const;

export type DisputeStatus = (typeof DISPUTE_STATUSES)[number];

export const disputeStatusValidator = v.union(
  v.literal("created"),
  v.literal("under_review"),
  v.literal("action_required"),
  v.literal("won"),
  v.literal("lost"),
  v.literal("closed")
);

// ============================================
// USER ROLE TYPES
// ============================================

export const USER_ROLES = ["customer", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const userRoleValidator = v.union(
  v.literal("customer"),
  v.literal("admin")
);

// ============================================
// ADDRESS TYPES
// ============================================

/**
 * Standard address structure used for shipping and billing.
 */
export interface Address {
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/**
 * Convex validator for address objects.
 * Use this in mutation args for address fields.
 */
export const addressValidator = v.object({
  name: v.string(),
  phone: v.string(),
  street: v.string(),
  city: v.string(),
  state: v.string(),
  postalCode: v.string(),
  country: v.string(),
});

// ============================================
// PAYMENT METHOD TYPES
// ============================================

export const PAYMENT_METHODS = ["razorpay", "invoice", "bank_transfer"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const paymentMethodValidator = v.union(
  v.literal("razorpay"),
  v.literal("invoice"),
  v.literal("bank_transfer")
);

// ============================================
// ORDER TYPE TYPES
// ============================================

export const ORDER_TYPES = ["retail", "wholesale"] as const;

export type OrderType = (typeof ORDER_TYPES)[number];

export const orderTypeValidator = v.union(
  v.literal("retail"),
  v.literal("wholesale")
);

// ============================================
// DISCOUNT TYPE TYPES
// ============================================

export const DISCOUNT_TYPES = ["percentage", "fixed"] as const;

export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const discountTypeValidator = v.union(
  v.literal("percentage"),
  v.literal("fixed")
);

// ============================================
// STOCK CHANGE TYPES
// ============================================

export const STOCK_CHANGE_TYPES = [
  "restock",
  "sale",
  "return",
  "adjustment",
  "damaged",
] as const;

export type StockChangeType = (typeof STOCK_CHANGE_TYPES)[number];

export const stockChangeTypeValidator = v.union(
  v.literal("restock"),
  v.literal("sale"),
  v.literal("return"),
  v.literal("adjustment"),
  v.literal("damaged")
);

// ============================================
// PROMO CODE STATUS TYPES
// ============================================

export const PROMO_CODE_STATUSES = ["active", "inactive", "expired"] as const;

export type PromoCodeStatus = (typeof PROMO_CODE_STATUSES)[number];

export const promoCodeStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("expired")
);

// ============================================
// STOCK STATUS TYPES
// ============================================

export const STOCK_STATUSES = [
  "all",
  "in_stock",
  "low_stock",
  "out_of_stock",
] as const;

export type StockStatus = (typeof STOCK_STATUSES)[number];

export const stockStatusValidator = v.union(
  v.literal("all"),
  v.literal("in_stock"),
  v.literal("low_stock"),
  v.literal("out_of_stock")
);

// ============================================
// SORT OPTIONS
// ============================================

export const PRODUCT_SORT_OPTIONS = [
  "price_asc",
  "price_desc",
  "name_asc",
  "name_desc",
  "newest",
  "popularity",
] as const;

export type ProductSortOption = (typeof PRODUCT_SORT_OPTIONS)[number];

export const productSortValidator = v.union(
  v.literal("price_asc"),
  v.literal("price_desc"),
  v.literal("name_asc"),
  v.literal("name_desc"),
  v.literal("newest"),
  v.literal("popularity")
);

// ============================================
// ORDER ITEM TYPE (for order creation)
// ============================================

export interface OrderItemInput {
  productId: string;
  variantSku: string;
  quantity: number;
}

export const orderItemInputValidator = v.object({
  productId: v.id("products"),
  variantSku: v.string(),
  quantity: v.number(),
});

// ============================================
// PRODUCT TYPES
// ============================================

/**
 * Product Image type for product gallery.
 */
export interface ProductImage {
  url: string;
  storageId?: string;
  alt: string;
  order: number;
}

/**
 * Product Variant type for size/color combinations.
 */
export interface ProductVariant {
  sku: string;
  size: string;
  color: string;
  colorHex?: string;
  stockQuantity: number;
  lowStockThreshold: number;
  weight?: number;
}

/**
 * ProductUpdate type for mutation updates.
 *
 * This replaces the unsafe `Record<string, unknown>` pattern with
 * proper type safety while maintaining flexibility for partial updates.
 *
 * ARCHITECTURE DECISION:
 * - All fields are optional to support partial updates
 * - Includes denormalized fields that are computed during updates
 * - Excludes immutable fields like _id and _creationTime
 */
export interface ProductUpdate {
  // Basic fields
  name?: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  subcategory?: string;

  // Pricing
  retailPrice?: number;
  wholesalePrice?: number;
  compareAtPrice?: number;
  costPrice?: number;

  // Media
  images?: ProductImage[];

  // Variants
  variants?: ProductVariant[];

  // Denormalized fields (computed during updates)
  availableSizes?: string[];
  availableColors?: string[];
  priceBucket?: string;
  hasLowStock?: boolean;

  // Flags
  featured?: boolean;
  bestseller?: boolean;
  newArrival?: boolean;
  isActive?: boolean;

  // Tags
  tags?: string[];

  // Wholesale
  minOrderQuantity?: number;

  // Metadata
  updatedAt?: number;
}
