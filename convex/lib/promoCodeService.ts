/**
 * Promo Code Service
 *
 * Extracted business logic for promo code validation and discount calculation.
 * This module follows the Single Responsibility Principle by separating:
 * - Eligibility validation (time, usage limits, user limits)
 * - Cart requirements validation (minimum order, categories)
 * - Discount calculation logic
 *
 * BENEFITS:
 * - Each function is small and testable
 * - Logic can be reused across different entry points
 * - Clear separation of concerns
 */

import { promoCodeError, emptyCart } from "./errors";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface CartItem {
  productId: Id<"products">;
  price: number;
  quantity: number;
}

export interface Cart {
  _id: Id<"cart">;
  items: CartItem[];
  appliedPromoCode?: string;
  promoDiscount?: number;
  lastModified?: number;
}

export interface PromoValidationResult {
  isValid: true;
  discount: number;
  promoCode: Doc<"promoCodes">;
}

// ============================================
// ELIGIBILITY VALIDATION
// ============================================

/**
 * Validates that a promo code is currently active.
 * @throws ConvexError if promo code is inactive
 */
export function validateActive(promoCode: Doc<"promoCodes">): void {
  if (!promoCode.isActive) {
    throw promoCodeError("INACTIVE_CODE", "This promo code is no longer active");
  }
}

/**
 * Validates time-based constraints (start date, expiry).
 * @throws ConvexError if promo code hasn't started or has expired
 */
export function validateTimeConstraints(promoCode: Doc<"promoCodes">): void {
  const now = Date.now();

  if (promoCode.startsAt > now) {
    throw promoCodeError("CODE_NOT_STARTED", "This promo code is not yet valid");
  }

  if (promoCode.expiresAt && promoCode.expiresAt < now) {
    throw promoCodeError("EXPIRED", "This promo code has expired");
  }
}

/**
 * Validates total usage limit for the promo code.
 * @throws ConvexError if usage limit has been reached
 */
export function validateUsageLimit(promoCode: Doc<"promoCodes">): void {
  if (promoCode.usageLimit && promoCode.currentUsageCount >= promoCode.usageLimit) {
    throw promoCodeError("LIMIT_REACHED", "This promo code has reached its usage limit");
  }
}

/**
 * Validates per-user usage limit.
 * Requires database query to check previous usage.
 * @throws ConvexError if user has exceeded their usage limit
 */
export async function validateUserUsageLimit(
  ctx: QueryCtx | MutationCtx,
  promoCode: Doc<"promoCodes">,
  userId: string
): Promise<void> {
  if (!promoCode.usagePerUser) {
    return; // No per-user limit
  }

  const userUsage = await ctx.db
    .query("promoCodeUsage")
    .withIndex("by_promo_user", (q) =>
      q.eq("promoCodeId", promoCode._id).eq("userId", userId)
    )
    .collect();

  if (userUsage.length >= promoCode.usagePerUser) {
    throw promoCodeError("USER_LIMIT", "You have already used this promo code");
  }
}

/**
 * Validates all eligibility constraints for a promo code.
 * This is the main validation entry point.
 */
export async function validatePromoCodeEligibility(
  ctx: QueryCtx | MutationCtx,
  promoCode: Doc<"promoCodes">,
  userId?: string
): Promise<void> {
  validateActive(promoCode);
  validateTimeConstraints(promoCode);
  validateUsageLimit(promoCode);

  if (userId) {
    await validateUserUsageLimit(ctx, promoCode, userId);
  }
}

// ============================================
// CART VALIDATION
// ============================================

/**
 * Validates that the cart exists and is not empty.
 * @returns The cart subtotal
 * @throws ConvexError if cart is empty or doesn't exist
 */
export function validateCartExists(cart: Cart | null): number {
  if (!cart || cart.items.length === 0) {
    throw emptyCart();
  }

  return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

/**
 * Validates minimum order amount requirement.
 * @throws ConvexError if cart subtotal is below minimum
 */
export function validateMinOrderAmount(
  promoCode: Doc<"promoCodes">,
  cartSubtotal: number
): void {
  if (promoCode.minOrderAmount && cartSubtotal < promoCode.minOrderAmount) {
    throw promoCodeError(
      "MIN_NOT_MET",
      `Minimum order of ₹${promoCode.minOrderAmount.toLocaleString()} required`
    );
  }
}

/**
 * Validates category restrictions.
 * Requires product lookups to check categories.
 * @throws ConvexError if no products in cart match applicable categories
 */
export async function validateCategoryRestrictions(
  ctx: QueryCtx | MutationCtx,
  promoCode: Doc<"promoCodes">,
  cartItems: CartItem[]
): Promise<void> {
  if (!promoCode.applicableCategories || promoCode.applicableCategories.length === 0) {
    return; // No category restrictions
  }

  // Get unique product IDs from cart
  const productIds = [...new Set(cartItems.map((item) => item.productId))];

  // Fetch products in parallel
  const products = await Promise.all(productIds.map((id) => ctx.db.get(id)));

  // Check if any product matches the applicable categories
  const hasApplicableProduct = products.some(
    (product) => product && promoCode.applicableCategories!.includes(product.category)
  );

  if (!hasApplicableProduct) {
    throw promoCodeError(
      "CATEGORY_NOT_APPLICABLE",
      `This promo code is only valid for: ${promoCode.applicableCategories.join(", ")}`
    );
  }
}

/**
 * Validates all cart requirements for a promo code.
 */
export async function validateCartRequirements(
  ctx: QueryCtx | MutationCtx,
  promoCode: Doc<"promoCodes">,
  cart: Cart | null
): Promise<number> {
  const cartSubtotal = validateCartExists(cart);
  validateMinOrderAmount(promoCode, cartSubtotal);
  await validateCategoryRestrictions(ctx, promoCode, cart!.items);
  return cartSubtotal;
}

// ============================================
// DISCOUNT CALCULATION
// ============================================

/**
 * Calculates the discount amount based on promo code type and cart subtotal.
 *
 * @param promoCode - The promo code being applied
 * @param cartSubtotal - The cart subtotal to calculate discount from
 * @returns The discount amount, rounded to 2 decimal places
 */
export function calculatePromoDiscount(
  promoCode: Doc<"promoCodes">,
  cartSubtotal: number
): number {
  let discount = 0;

  if (promoCode.discountType === "percentage") {
    // Calculate percentage discount
    discount = cartSubtotal * (promoCode.discountValue / 100);

    // Cap at maxDiscountAmount if specified
    if (promoCode.maxDiscountAmount) {
      discount = Math.min(discount, promoCode.maxDiscountAmount);
    }
  } else {
    // Fixed discount - cap at cart subtotal (can't discount more than cart value)
    discount = Math.min(promoCode.discountValue, cartSubtotal);
  }

  // Round to 2 decimal places to avoid floating point issues
  return Math.round(discount * 100) / 100;
}

// ============================================
// PROMO CODE LOOKUP
// ============================================

/**
 * Finds a promo code by code string (case-insensitive).
 * @throws ConvexError if promo code doesn't exist
 */
export async function findPromoCodeByCode(
  ctx: QueryCtx | MutationCtx,
  code: string
): Promise<Doc<"promoCodes">> {
  const normalizedCode = code.toUpperCase().trim();

  const promoCode = await ctx.db
    .query("promoCodes")
    .withIndex("by_code", (q) => q.eq("code", normalizedCode))
    .first();

  if (!promoCode) {
    throw promoCodeError("INVALID_CODE", "Invalid promo code");
  }

  return promoCode;
}

// ============================================
// ADMIN VALIDATION HELPERS
// ============================================

/**
 * Validates promo code creation arguments.
 * Used by admin mutations to ensure valid promo code configuration.
 */
export function validatePromoCodeCreation(args: {
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  startsAt: number;
  expiresAt?: number;
}): string {
  // Validate code format
  const normalizedCode = args.code.toUpperCase().trim();
  if (normalizedCode.length < 3 || normalizedCode.length > 20) {
    throw promoCodeError(
      "INVALID_CODE_FORMAT",
      "Promo code must be between 3 and 20 characters"
    );
  }

  // Validate discount value
  validateDiscountValue(args.discountType, args.discountValue);

  // Validate dates
  if (args.expiresAt && args.expiresAt <= args.startsAt) {
    throw promoCodeError("INVALID_DATES", "Expiry date must be after start date");
  }

  return normalizedCode;
}

/**
 * Validates discount value based on discount type.
 */
export function validateDiscountValue(
  discountType: "percentage" | "fixed",
  discountValue: number
): void {
  if (discountType === "percentage") {
    if (discountValue <= 0 || discountValue > 100) {
      throw promoCodeError(
        "INVALID_DISCOUNT",
        "Percentage discount must be between 1 and 100"
      );
    }
  } else {
    if (discountValue <= 0) {
      throw promoCodeError("INVALID_DISCOUNT", "Fixed discount must be greater than 0");
    }
  }
}

/**
 * Checks for duplicate promo code.
 * @throws ConvexError if code already exists
 */
export async function checkDuplicateCode(
  ctx: QueryCtx | MutationCtx,
  normalizedCode: string
): Promise<void> {
  const existingCode = await ctx.db
    .query("promoCodes")
    .withIndex("by_code", (q) => q.eq("code", normalizedCode))
    .first();

  if (existingCode) {
    throw promoCodeError("DUPLICATE_CODE", "A promo code with this code already exists");
  }
}

// ============================================
// COMPUTED STATUS HELPER
// ============================================

/**
 * Computes the current status of a promo code based on its properties.
 */
export function computePromoCodeStatus(
  promoCode: Doc<"promoCodes">
): "active" | "inactive" | "expired" {
  const now = Date.now();

  if (promoCode.expiresAt && promoCode.expiresAt < now) {
    return "expired";
  }

  if (!promoCode.isActive) {
    return "inactive";
  }

  return "active";
}

/**
 * Checks if a promo code has reached its usage limit.
 */
export function isUsageLimitReached(promoCode: Doc<"promoCodes">): boolean {
  return promoCode.usageLimit
    ? promoCode.currentUsageCount >= promoCode.usageLimit
    : false;
}
