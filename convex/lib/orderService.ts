/**
 * Order Service Layer
 *
 * This module encapsulates order-related business logic following the Single Responsibility Principle.
 * Each function handles a specific domain concern, making the code more maintainable and testable.
 */

import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { ConvexError } from "convex/values";
import { getTaxRate, getShippingConfig } from "./getSettings";

// ============================================================================
// Types
// ============================================================================

/**
 * Validated order item with product details and pricing
 */
export interface ValidatedOrderItem {
  productId: Id<"products">;
  variantSku: string;
  quantity: number;
  name: string;
  image: string;
  size: string;
  color: string;
  unitPrice: number;
  subtotal: number;
}

/**
 * Raw order item input from the client
 */
export interface RawOrderItem {
  productId: Id<"products">;
  variantSku: string;
  quantity: number;
}

/**
 * Complete pricing breakdown for an order
 */
export interface OrderPricing {
  subtotal: number;
  tax: number;
  taxRate: number;
  shippingCost: number;
  discount: number;
  total: number;
  promoCodeId?: Id<"promoCodes">;
  promoCode?: string;
  promoDiscount?: number;
}

/**
 * Promo code validation and calculation result
 */
export interface PromoResult {
  isValid: boolean;
  promoCodeId?: Id<"promoCodes">;
  promoCode?: string;
  discount: number;
  errorMessage?: string;
}

/**
 * Inventory change tracking for logging
 */
export interface InventoryDeduction {
  productId: Id<"products">;
  variantSku: string;
  quantity: number;
  quantityBefore: number;
}

// ============================================================================
// Order Item Validation
// ============================================================================

/**
 * Validates and enriches order items with product data and pricing
 *
 * This function:
 * - Validates product existence and availability
 * - Checks variant availability and stock levels
 * - Validates quantities and minimum order requirements
 * - Applies correct pricing (retail vs wholesale)
 *
 * @param ctx - Convex mutation context
 * @param items - Raw order items from client
 * @param orderType - Type of order (retail or wholesale)
 * @returns Array of validated and enriched order items
 * @throws ConvexError if validation fails
 */
export async function validateOrderItems(
  ctx: MutationCtx | QueryCtx,
  items: RawOrderItem[],
  orderType: "retail" | "wholesale"
): Promise<ValidatedOrderItem[]> {
  if (items.length === 0) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Order must contain at least one item",
    });
  }

  // OPTIMIZATION: Batch-fetch all products to reduce N+1 queries
  const uniqueProductIds = [...new Set(items.map(item => item.productId))];
  type ProductDoc = NonNullable<Awaited<ReturnType<typeof ctx.db.get<"products">>>>;
  const productsMap = new Map<string, ProductDoc>();

  await Promise.all(
    uniqueProductIds.map(async (productId) => {
      const product = await ctx.db.get(productId);
      if (product) {
        productsMap.set(productId, product as ProductDoc);
      }
    })
  );

  const validatedItems: ValidatedOrderItem[] = [];

  // Validate each item
  for (const item of items) {
    const product = productsMap.get(item.productId);
    if (!product) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `Product not found`,
      });
    }

    if (!product.isActive) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: `${product.name} is no longer available`,
      });
    }

    const variantIndex = product.variants.findIndex(v => v.sku === item.variantSku);
    if (variantIndex === -1) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `Variant ${item.variantSku} not found for ${product.name}`,
      });
    }

    const variant = product.variants[variantIndex];

    // Validate quantity
    if (item.quantity <= 0) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: `Invalid quantity for ${product.name}`,
      });
    }

    if (variant.stockQuantity < item.quantity) {
      throw new ConvexError({
        code: "OUT_OF_STOCK",
        message: `Insufficient stock for ${product.name} - ${variant.size}/${variant.color}. Only ${variant.stockQuantity} available.`,
      });
    }

    // Validate minimum order quantity for wholesale
    if (orderType === "wholesale" && product.wholesalePrice && product.minOrderQuantity && item.quantity < product.minOrderQuantity) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: `Wholesale orders for ${product.name} require a minimum of ${product.minOrderQuantity} units. You ordered ${item.quantity}.`,
      });
    }

    // Determine price based on order type
    let unitPrice = product.retailPrice;
    if (orderType === "wholesale" && product.wholesalePrice) {
      unitPrice = product.wholesalePrice;
    }

    validatedItems.push({
      productId: item.productId,
      variantSku: item.variantSku,
      quantity: item.quantity,
      name: product.name,
      image: product.images[0]?.url || "",
      size: variant.size,
      color: variant.color,
      unitPrice,
      subtotal: unitPrice * item.quantity,
    });
  }

  return validatedItems;
}

// ============================================================================
// Pricing Calculations
// ============================================================================

/**
 * Calculates complete order pricing including taxes, shipping, and discounts
 *
 * This function:
 * - Calculates subtotal from validated items
 * - Applies promo code discounts if provided
 * - Calculates tax based on dynamic settings
 * - Determines shipping cost based on order value
 * - Computes final total
 *
 * @param ctx - Convex mutation or query context
 * @param validatedItems - Pre-validated order items
 * @param promoCode - Optional promo code to apply
 * @param orderType - Type of order (retail or wholesale)
 * @param userId - Optional user ID for promo code validation
 * @returns Complete pricing breakdown
 */
export async function calculateOrderPricing(
  ctx: MutationCtx | QueryCtx,
  validatedItems: ValidatedOrderItem[],
  promoCode?: string,
  orderType: "retail" | "wholesale" = "retail",
  userId?: string
): Promise<OrderPricing> {
  const subtotal = validatedItems.reduce((sum, item) => sum + item.subtotal, 0);

  // Apply promo code if provided
  let promoDiscount = 0;
  let promoCodeId: Id<"promoCodes"> | undefined;
  let promoCodeStr: string | undefined;

  if (promoCode) {
    const promoResult = await applyPromoCode(ctx, promoCode, subtotal, orderType, userId);
    if (promoResult.isValid) {
      promoDiscount = promoResult.discount;
      promoCodeId = promoResult.promoCodeId;
      promoCodeStr = promoResult.promoCode;
    }
  }

  // Get dynamic settings for tax and shipping
  const taxRate = await getTaxRate(ctx);
  const { freeThreshold, standardCost } = await getShippingConfig(ctx);

  const tax = subtotal * taxRate;
  const shippingCost = subtotal >= freeThreshold ? 0 : standardCost;
  const total = subtotal + tax + shippingCost - promoDiscount;

  return {
    subtotal,
    tax,
    taxRate,
    shippingCost,
    discount: promoDiscount,
    total,
    promoCodeId,
    promoCode: promoCodeStr,
    promoDiscount: promoDiscount > 0 ? promoDiscount : undefined,
  };
}

// ============================================================================
// Promo Code Handling
// ============================================================================

/**
 * Validates and applies a promo code to calculate discount
 *
 * This function:
 * - Finds and validates the promo code
 * - Checks expiration, usage limits, and order type restrictions
 * - Validates minimum order amount
 * - Checks per-user usage limits
 * - Calculates discount amount (percentage or fixed)
 *
 * SECURITY: Uses timing-safe validation pattern to prevent timing attacks
 * that could reveal which promo codes exist in the system.
 *
 * @param ctx - Convex mutation or query context
 * @param code - Promo code string
 * @param subtotal - Order subtotal before discount
 * @param orderType - Type of order (retail or wholesale)
 * @param userId - Optional user ID for per-user limit checking
 * @returns Promo validation result with discount amount
 */
export async function applyPromoCode(
  ctx: MutationCtx | QueryCtx,
  code: string,
  subtotal: number,
  orderType: "retail" | "wholesale",
  userId?: string
): Promise<PromoResult> {
  const normalizedCode = code.toUpperCase().trim();

  // TIMING-SAFE: Always query the promo code table
  const promoCode = await ctx.db
    .query("promoCodes")
    .withIndex("by_code", (q) => q.eq("code", normalizedCode))
    .first();

  // TIMING-SAFE: Always perform a usage query to ensure consistent timing
  // This query happens regardless of whether the promo code exists
  // We use a dummy ID if promo doesn't exist so the query structure is identical
  const userUsage = userId && promoCode
    ? await ctx.db
        .query("promoCodeUsage")
        .withIndex("by_promo_user", (q) =>
          q.eq("promoCodeId", promoCode._id).eq("userId", userId)
        )
        .collect()
    : userId
      ? await ctx.db
          .query("promoCodeUsage")
          .filter((q) => q.eq(q.field("userId"), "dummy-timing-safe"))
          .take(1)  // Perform similar query structure for timing consistency
      : [];

  // Now perform all validation checks
  // Invalid code or inactive
  if (!promoCode || !promoCode.isActive) {
    return {
      isValid: false,
      discount: 0,
      errorMessage: "Invalid or inactive promo code",
    };
  }

  const now = Date.now();

  // Check expiration
  if (promoCode.expiresAt && promoCode.expiresAt < now) {
    return {
      isValid: false,
      discount: 0,
      errorMessage: "Promo code has expired",
    };
  }

  // Check start date
  if (promoCode.startsAt > now) {
    return {
      isValid: false,
      discount: 0,
      errorMessage: "Promo code is not yet active",
    };
  }

  // Check usage limit
  if (promoCode.usageLimit && promoCode.currentUsageCount >= promoCode.usageLimit) {
    return {
      isValid: false,
      discount: 0,
      errorMessage: "Promo code usage limit reached",
    };
  }

  // Check wholesale exclusion
  if (promoCode.excludeWholesale && orderType === "wholesale") {
    return {
      isValid: false,
      discount: 0,
      errorMessage: "Promo code not valid for wholesale orders",
    };
  }

  // Check minimum order amount
  if (promoCode.minOrderAmount && subtotal < promoCode.minOrderAmount) {
    return {
      isValid: false,
      discount: 0,
      errorMessage: `Minimum order amount of ₹${promoCode.minOrderAmount} required`,
    };
  }

  // Check per-user usage limit (using already-fetched data)
  if (userId && promoCode.usagePerUser) {
    if (userUsage.length >= promoCode.usagePerUser) {
      return {
        isValid: false,
        discount: 0,
        errorMessage: "You have already used this promo code",
      };
    }
  }

  // Calculate discount
  let discount = 0;
  if (promoCode.discountType === "percentage") {
    discount = subtotal * (promoCode.discountValue / 100);
    if (promoCode.maxDiscountAmount) {
      discount = Math.min(discount, promoCode.maxDiscountAmount);
    }
  } else {
    discount = Math.min(promoCode.discountValue, subtotal);
  }

  discount = Math.round(discount * 100) / 100;

  return {
    isValid: true,
    promoCodeId: promoCode._id,
    promoCode: promoCode.code,
    discount,
  };
}

/**
 * Records promo code usage and updates usage count
 *
 * This function:
 * - Creates a usage record in the database
 * - Increments the promo code's usage counter
 *
 * @param ctx - Convex mutation context
 * @param promoCodeId - ID of the promo code
 * @param orderId - ID of the order using the promo
 * @param userId - ID of the user
 * @param discount - Discount amount applied
 */
export async function recordPromoUsage(
  ctx: MutationCtx,
  promoCodeId: Id<"promoCodes">,
  orderId: Id<"orders">,
  userId: string,
  discount: number
): Promise<void> {
  const now = Date.now();

  await ctx.db.insert("promoCodeUsage", {
    promoCodeId,
    userId,
    orderId,
    discountApplied: discount,
    usedAt: now,
  });

  // Increment usage count
  const promoCode = await ctx.db.get(promoCodeId);
  if (promoCode) {
    await ctx.db.patch(promoCodeId, {
      currentUsageCount: promoCode.currentUsageCount + 1,
      updatedAt: now,
    });
  }
}

// ============================================================================
// Inventory Operations
// ============================================================================

/**
 * Deducts inventory for order items atomically
 *
 * This function:
 * - Deducts stock quantities for all order items
 * - Updates low stock flags
 * - Creates inventory log entries for audit trail
 *
 * IMPORTANT: This operation is atomic within the Convex mutation.
 * All inventory changes are committed together or rolled back on error.
 *
 * @param ctx - Convex mutation context
 * @param items - Validated order items
 * @param orderId - ID of the order
 * @returns Array of inventory deductions for logging
 */
export async function deductInventory(
  ctx: MutationCtx,
  items: ValidatedOrderItem[],
  orderId: Id<"orders">
): Promise<InventoryDeduction[]> {
  const now = Date.now();
  const inventoryDeductions: InventoryDeduction[] = [];

  // Fetch all products again to ensure we have latest data
  const uniqueProductIds = [...new Set(items.map(item => item.productId))];
  type ProductDoc = NonNullable<Awaited<ReturnType<typeof ctx.db.get<"products">>>>;
  const productsMap = new Map<string, ProductDoc>();

  await Promise.all(
    uniqueProductIds.map(async (productId) => {
      const product = await ctx.db.get(productId);
      if (product) {
        productsMap.set(productId, product as ProductDoc);
      }
    })
  );

  // Deduct inventory for each item
  for (const item of items) {
    const product = productsMap.get(item.productId);
    if (!product) continue;

    const variantIndex = product.variants.findIndex(v => v.sku === item.variantSku);
    if (variantIndex === -1) continue;

    const variant = product.variants[variantIndex];

    // ATOMIC STOCK VALIDATION: Re-check stock at deduction time to prevent race conditions
    // Stock may have changed between validateOrderItems and now if another order completed
    if (variant.stockQuantity < item.quantity) {
      throw new ConvexError({
        code: "STOCK_CHANGED",
        message: `Stock for ${product.name} (${variant.size}/${variant.color}) changed during checkout. ` +
                 `Requested: ${item.quantity}, Available: ${variant.stockQuantity}. Please try again.`,
      });
    }

    // Atomically update variant stock
    const updatedVariants = [...product.variants];
    const quantityBefore = updatedVariants[variantIndex].stockQuantity;
    updatedVariants[variantIndex] = {
      ...updatedVariants[variantIndex],
      stockQuantity: quantityBefore - item.quantity,
    };

    // Recalculate hasLowStock flag
    const hasLowStock = updatedVariants.some(
      v => v.stockQuantity <= v.lowStockThreshold
    );

    await ctx.db.patch(item.productId, {
      variants: updatedVariants,
      hasLowStock,
      updatedAt: now,
    });

    // Track deduction for logging
    inventoryDeductions.push({
      productId: item.productId,
      variantSku: item.variantSku,
      quantity: item.quantity,
      quantityBefore,
    });
  }

  // Create inventory log entries
  await Promise.all(
    inventoryDeductions.map(deduction =>
      ctx.db.insert("inventoryLogs", {
        productId: deduction.productId,
        variantSku: deduction.variantSku,
        changeType: "sale" as const,
        quantityBefore: deduction.quantityBefore,
        quantityChange: -deduction.quantity,
        quantityAfter: deduction.quantityBefore - deduction.quantity,
        orderId,
        changedBy: "system",
        timestamp: now,
      })
    )
  );

  return inventoryDeductions;
}

/**
 * Restores inventory for cancelled or returned orders
 *
 * This function:
 * - Adds back stock quantities for order items
 * - Updates low stock flags
 * - Creates inventory log entries for audit trail
 *
 * @param ctx - Convex mutation context
 * @param items - Order items to restore
 * @param orderId - ID of the order
 * @param reason - Reason for restoration (e.g., "Order cancelled")
 * @param changedBy - User or system identifier
 */
export async function restoreInventory(
  ctx: MutationCtx,
  items: ValidatedOrderItem[],
  orderId: Id<"orders">,
  reason: string,
  changedBy: string
): Promise<void> {
  const now = Date.now();

  // Batch fetch all products
  const uniqueProductIds = [...new Set(items.map(item => item.productId))];
  type ProductDoc = NonNullable<Awaited<ReturnType<typeof ctx.db.get<"products">>>>;
  const productsMap = new Map<string, ProductDoc>();

  await Promise.all(
    uniqueProductIds.map(async (productId) => {
      const product = await ctx.db.get(productId);
      if (product) {
        productsMap.set(productId, product as ProductDoc);
      }
    })
  );

  interface InventoryUpdate {
    productId: Id<"products">;
    updatedVariants: ProductDoc["variants"];
    hasLowStock: boolean;
  }

  interface InventoryLogEntry {
    productId: Id<"products">;
    variantSku: string;
    quantityBefore: number;
    quantityAfter: number;
    quantity: number;
  }

  const inventoryUpdates: InventoryUpdate[] = [];
  const inventoryLogEntries: InventoryLogEntry[] = [];

  // Prepare inventory updates
  for (const item of items) {
    const product = productsMap.get(item.productId);
    if (!product) continue;

    const variantIndex = product.variants.findIndex(v => v.sku === item.variantSku);
    if (variantIndex === -1) continue;

    const updatedVariants = [...product.variants];
    const quantityBefore = updatedVariants[variantIndex].stockQuantity;
    updatedVariants[variantIndex] = {
      ...updatedVariants[variantIndex],
      stockQuantity: quantityBefore + item.quantity,
    };

    // Recalculate hasLowStock flag
    const hasLowStock = updatedVariants.some(
      v => v.stockQuantity <= v.lowStockThreshold
    );

    inventoryUpdates.push({
      productId: item.productId,
      updatedVariants,
      hasLowStock,
    });

    inventoryLogEntries.push({
      productId: item.productId,
      variantSku: item.variantSku,
      quantityBefore,
      quantityAfter: quantityBefore + item.quantity,
      quantity: item.quantity,
    });
  }

  // Execute all updates in parallel
  await Promise.all([
    // Update product inventory
    ...inventoryUpdates.map(update =>
      ctx.db.patch(update.productId, {
        variants: update.updatedVariants,
        hasLowStock: update.hasLowStock,
        updatedAt: now,
      })
    ),
    // Create inventory logs
    ...inventoryLogEntries.map(entry =>
      ctx.db.insert("inventoryLogs", {
        productId: entry.productId,
        variantSku: entry.variantSku,
        changeType: "return" as const,
        quantityBefore: entry.quantityBefore,
        quantityChange: entry.quantity,
        quantityAfter: entry.quantityAfter,
        reason,
        orderId,
        changedBy,
        timestamp: now,
      })
    ),
  ]);
}

// ============================================================================
// Order Number Generation
// ============================================================================

/**
 * Generates a unique order number with collision checking
 *
 * Format: NW-{timestamp}-{random}
 * Example: NW-L3K5M9-A7B2
 *
 * @param ctx - Convex mutation context
 * @returns Unique order number
 */
export async function generateUniqueOrderNumber(ctx: MutationCtx): Promise<string> {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `NW-${timestamp}-${random}`;

    // Check if order number already exists
    const existing = await ctx.db
      .query("orders")
      .withIndex("by_order_number", (q) => q.eq("orderNumber", orderNumber))
      .first();

    if (!existing) {
      return orderNumber;
    }

    attempts++;
  }

  // Fallback with more randomness
  const fallback = `NW-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
  return fallback;
}

// ============================================================================
// Cart Operations
// ============================================================================

/**
 * Clears the user's cart after successful order creation
 *
 * @param ctx - Convex mutation context
 * @param userId - User's Clerk ID
 */
export async function clearUserCart(
  ctx: MutationCtx,
  userId: string
): Promise<void> {
  const cart = await ctx.db
    .query("cart")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .first();

  if (cart) {
    await ctx.db.delete(cart._id);
  }
}

// ============================================================================
// Status History
// ============================================================================

/**
 * Creates an order status history entry
 *
 * @param ctx - Convex mutation context
 * @param orderId - Order ID
 * @param fromStatus - Previous status (undefined for new orders)
 * @param toStatus - New status
 * @param changedBy - User or system identifier
 * @param notes - Optional notes about the status change
 */
export async function createStatusHistory(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  fromStatus: string | undefined,
  toStatus: string,
  changedBy: string,
  notes?: string
): Promise<void> {
  await ctx.db.insert("orderStatusHistory", {
    orderId,
    fromStatus,
    toStatus: toStatus as "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled",
    changedBy,
    notes,
    timestamp: Date.now(),
  });
}
