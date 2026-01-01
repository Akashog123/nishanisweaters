/**
 * Cart Utility Functions
 *
 * Helper functions for cart operations to reduce complexity in cart.ts.
 * These functions handle cart item validation, stock checking, and merging logic.
 */

import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// ============================================
// TYPE DEFINITIONS
// ============================================

/** Base cart item structure from schema */
export interface CartItem {
  productId: Id<"products">;
  variantSku: string;
  quantity: number;
  name: string;
  image: string;
  size: string;
  color: string;
  price: number;
  addedAt: number;
}

/** Cart item after validation with current product data */
export interface ValidatedCartItem extends CartItem {
  isValid: boolean;
  maxStock?: number;
}

/** Result of validating a single cart item against product data */
export interface CartItemValidationResult {
  item: CartItem | null;
  isValid: boolean;
  reason?: string;
  maxStock?: number;
}

/** Product variant structure for stock checking */
interface ProductVariant {
  sku: string;
  stockQuantity: number;
  size: string;
  color: string;
}

/** Minimal product data needed for cart operations (not exported, internal use only) */
interface _ProductData {
  _id: Id<"products">;
  name: string;
  retailPrice: number;
  isActive: boolean;
  images: Array<{ url: string }>;
  variants: ProductVariant[];
}

// ============================================
// CART ITEM VALIDATION
// ============================================

/**
 * Validates a single cart item against current product data.
 * Checks product availability, variant existence, and stock levels.
 *
 * @param ctx - Convex query/mutation context for database access
 * @param item - The cart item to validate
 * @returns Validated cart item with updated price, or null if invalid
 */
export async function validateCartItem(
  ctx: QueryCtx | MutationCtx,
  item: CartItem
): Promise<CartItemValidationResult> {
  const product = await ctx.db.get(item.productId);

  // Product no longer exists or inactive
  if (!product || !product.isActive) {
    return {
      item: null,
      isValid: false,
      reason: "Product no longer available",
    };
  }

  // Variant no longer exists
  const variant = product.variants.find((v) => v.sku === item.variantSku);
  if (!variant) {
    return {
      item: null,
      isValid: false,
      reason: "Variant no longer available",
    };
  }

  // Out of stock
  const validatedQuantity = Math.min(item.quantity, variant.stockQuantity);
  if (validatedQuantity <= 0) {
    return {
      item: null,
      isValid: false,
      reason: "Out of stock",
    };
  }

  // Return validated item with current data
  return {
    item: {
      ...item,
      quantity: validatedQuantity,
      price: product.retailPrice,
      name: product.name,
      image: product.images[0]?.url || item.image,
    },
    isValid: true,
    maxStock: variant.stockQuantity,
  };
}

/**
 * Validates multiple cart items in parallel.
 * Filters out invalid items and returns only valid ones with updated data.
 *
 * @param ctx - Convex query/mutation context for database access
 * @param items - Array of cart items to validate
 * @returns Array of validated cart items (invalid items are filtered out)
 */
export async function validateCartItems(
  ctx: QueryCtx | MutationCtx,
  items: CartItem[]
): Promise<ValidatedCartItem[]> {
  const validationResults = await Promise.all(
    items.map((item) => validateCartItem(ctx, item))
  );

  return validationResults
    .filter((result): result is CartItemValidationResult & { item: CartItem } =>
      result.isValid && result.item !== null
    )
    .map((result) => ({
      ...result.item,
      isValid: true,
      maxStock: result.maxStock,
    }));
}

// ============================================
// STOCK VALIDATION
// ============================================

/**
 * Gets the maximum available stock for a product variant.
 *
 * @param ctx - Convex query/mutation context for database access
 * @param productId - The product ID to check
 * @param variantSku - The variant SKU to check
 * @returns The available stock quantity, or 0 if product/variant not found
 */
export async function getVariantStock(
  ctx: QueryCtx | MutationCtx,
  productId: Id<"products">,
  variantSku: string
): Promise<number> {
  const product = await ctx.db.get(productId);
  if (!product) {
    return 0;
  }

  const variant = product.variants.find((v) => v.sku === variantSku);
  return variant?.stockQuantity ?? 0;
}

// ============================================
// CART MERGING LOGIC
// ============================================

/**
 * Finds the index of an item in a cart by product and variant.
 *
 * @param items - Array of cart items to search
 * @param productId - The product ID to find
 * @param variantSku - The variant SKU to find
 * @returns The index of the matching item, or -1 if not found
 */
export function findCartItemIndex(
  items: CartItem[],
  productId: Id<"products">,
  variantSku: string
): number {
  return items.findIndex(
    (item) => item.productId === productId && item.variantSku === variantSku
  );
}

/**
 * Merges a single guest cart item into the user's cart items.
 * Handles quantity combination with stock limits using early returns.
 *
 * @param ctx - Convex mutation context for database access
 * @param userItems - Current user cart items (will be mutated)
 * @param guestItem - Guest cart item to merge
 * @returns Updated cart items array
 */
export async function mergeCartItem(
  ctx: MutationCtx,
  userItems: CartItem[],
  guestItem: CartItem
): Promise<CartItem[]> {
  const existingIndex = findCartItemIndex(
    userItems,
    guestItem.productId,
    guestItem.variantSku
  );

  // No existing item - simply add the guest item
  if (existingIndex < 0) {
    return [...userItems, guestItem];
  }

  // Get current stock for merged quantity validation
  const maxStock = await getVariantStock(
    ctx,
    guestItem.productId,
    guestItem.variantSku
  );

  // Calculate merged quantity, capped at available stock
  const existingItem = userItems[existingIndex];
  const mergedQuantity = Math.min(
    existingItem.quantity + guestItem.quantity,
    maxStock
  );

  // Create updated items array with merged quantity
  const updatedItems = [...userItems];
  updatedItems[existingIndex] = {
    ...existingItem,
    quantity: mergedQuantity,
    price: guestItem.price, // Use refreshed price from validated guest item
  };

  return updatedItems;
}

/**
 * Merges all guest cart items into user cart items.
 * Processes items sequentially to maintain correct quantity totals.
 *
 * @param ctx - Convex mutation context for database access
 * @param userItems - Current user cart items
 * @param guestItems - Validated guest cart items to merge
 * @returns Merged cart items array
 */
export async function mergeCartItems(
  ctx: MutationCtx,
  userItems: CartItem[],
  guestItems: CartItem[]
): Promise<CartItem[]> {
  let mergedItems = [...userItems];

  for (const guestItem of guestItems) {
    mergedItems = await mergeCartItem(ctx, mergedItems, guestItem);
  }

  return mergedItems;
}

// ============================================
// CART EXPIRATION
// ============================================

/** Default cart expiration period: 7 days in milliseconds */
export const CART_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Calculates the expiration timestamp for a cart.
 *
 * @param fromTime - Base time (defaults to now)
 * @returns Expiration timestamp
 */
export function calculateCartExpiration(fromTime: number = Date.now()): number {
  return fromTime + CART_EXPIRATION_MS;
}

// ============================================
// CHECKOUT VALIDATION
// ============================================

/** Result of validating a cart item for checkout */
export interface CheckoutValidationItem extends CartItem {
  isValid: boolean;
  maxAvailable?: number;
  currentPrice?: number;
  priceChanged?: boolean;
}

/** Result of full cart validation for checkout */
export interface CheckoutValidationResult {
  isValid: boolean;
  errors: string[];
  items: CheckoutValidationItem[];
}

/**
 * Validates a single cart item for checkout.
 * Returns detailed error messages for user display.
 *
 * @param ctx - Convex query/mutation context
 * @param item - Cart item to validate
 * @returns Validation result with error message if invalid
 */
export async function validateCartItemForCheckout(
  ctx: QueryCtx | MutationCtx,
  item: CartItem
): Promise<{ validatedItem: CheckoutValidationItem; error: string | null }> {
  const product = await ctx.db.get(item.productId);

  // Product unavailable
  if (!product || !product.isActive) {
    return {
      validatedItem: { ...item, isValid: false },
      error: `${item.name} is no longer available`,
    };
  }

  // Variant unavailable
  const variant = product.variants.find((v) => v.sku === item.variantSku);
  if (!variant) {
    return {
      validatedItem: { ...item, isValid: false },
      error: `${item.name} (${item.size}/${item.color}) is no longer available`,
    };
  }

  // Insufficient stock
  if (variant.stockQuantity < item.quantity) {
    const error = variant.stockQuantity === 0
      ? `${item.name} is out of stock`
      : `Only ${variant.stockQuantity} of ${item.name} available (you have ${item.quantity})`;

    return {
      validatedItem: {
        ...item,
        isValid: false,
        maxAvailable: variant.stockQuantity,
      },
      error,
    };
  }

  // Valid item
  return {
    validatedItem: {
      ...item,
      isValid: true,
      currentPrice: product.retailPrice,
      priceChanged: item.price !== product.retailPrice,
    },
    error: null,
  };
}

/**
 * Validates all cart items for checkout.
 * Collects all errors and returns detailed validation results.
 *
 * @param ctx - Convex query/mutation context
 * @param items - Cart items to validate
 * @returns Full checkout validation result with errors and validated items
 */
export async function validateCartForCheckout(
  ctx: QueryCtx | MutationCtx,
  items: CartItem[]
): Promise<CheckoutValidationResult> {
  const results = await Promise.all(
    items.map((item) => validateCartItemForCheckout(ctx, item))
  );

  const errors: string[] = [];
  const validatedItems: CheckoutValidationItem[] = [];

  for (const { validatedItem, error } of results) {
    validatedItems.push(validatedItem);
    if (error) {
      errors.push(error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    items: validatedItems,
  };
}
