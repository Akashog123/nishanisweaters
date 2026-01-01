import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, getCurrentUser } from "./lib/auth";

// Shared types and validators
import { discountTypeValidator, promoCodeStatusValidator } from "./lib/types";

// Error factory
import { notFound, cartNotFound, promoCodeError } from "./lib/errors";

// Promo code service (extracted business logic)
import {
  findPromoCodeByCode,
  validatePromoCodeEligibility,
  validateCartRequirements,
  calculatePromoDiscount,
  validatePromoCodeCreation,
  validateDiscountValue,
  checkDuplicateCode,
  computePromoCodeStatus,
  isUsageLimitReached,
  type Cart,
} from "./lib/promoCodeService";

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get cart identifier from server-side auth or session
 */
async function getCartIdentifier(ctx: QueryCtx | MutationCtx, sessionId?: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    return { userId: identity.subject, sessionId: undefined };
  }
  return { userId: undefined, sessionId };
}

/**
 * Find cart by user ID or session ID
 */
async function findCart(ctx: QueryCtx | MutationCtx, userId?: string, sessionId?: string) {
  if (userId) {
    return ctx.db.query("cart").withIndex("by_user_id", (q) => q.eq("userId", userId)).first();
  }
  if (sessionId) {
    return ctx.db.query("cart").withIndex("by_session_id", (q) => q.eq("sessionId", sessionId)).first();
  }
  return null;
}

// ============================================
// ADMIN QUERIES
// ============================================

// Query: List all promo codes (admin only)
export const listPromoCodes = query({
  args: {
    status: v.optional(promoCodeStatusValidator),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = args.limit ?? 20;
    const offset = args.offset ?? 0;

    let promoCodesQuery = ctx.db.query("promoCodes");

    // Get all promo codes (we'll filter in memory for status since it's computed)
    const allPromoCodes = await promoCodesQuery.collect();

    // Filter by computed status using extracted helper
    let filteredPromoCodes = allPromoCodes;
    if (args.status) {
      filteredPromoCodes = allPromoCodes.filter((code) => {
        const status = computePromoCodeStatus(code);
        return status === args.status;
      });
    }

    // Sort by createdAt descending (newest first)
    filteredPromoCodes.sort((a, b) => b.createdAt - a.createdAt);

    // Paginate
    const paginatedPromoCodes = filteredPromoCodes.slice(offset, offset + limit);

    // Add computed fields using extracted helpers
    const promoCodesWithStatus = paginatedPromoCodes.map((code) => {
      const computedStatus = computePromoCodeStatus(code);
      const isLimitReached = isUsageLimitReached(code);

      return {
        ...code,
        isExpired: computedStatus === "expired",
        isLimitReached,
        computedStatus,
      };
    });

    return {
      promoCodes: promoCodesWithStatus,
      total: filteredPromoCodes.length,
      hasMore: offset + limit < filteredPromoCodes.length,
    };
  },
});

// Query: Get single promo code details (admin only)
export const getPromoCode = query({
  args: {
    promoCodeId: v.id("promoCodes"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const promoCode = await ctx.db.get(args.promoCodeId);
    if (!promoCode) {
      throw notFound("Promo code");
    }

    // Get usage statistics
    const usage = await ctx.db
      .query("promoCodeUsage")
      .withIndex("by_promo_code", (q) => q.eq("promoCodeId", args.promoCodeId))
      .collect();

    const totalDiscountGiven = usage.reduce((sum, u) => sum + u.discountApplied, 0);

    return {
      ...promoCode,
      usageHistory: usage,
      totalDiscountGiven,
    };
  },
});

// Query: Get promo code statistics (admin only)
export const getPromoCodeStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allPromoCodes = await ctx.db.query("promoCodes").collect();
    const allUsage = await ctx.db.query("promoCodeUsage").collect();

    // Use extracted helpers for status computation
    const active = allPromoCodes.filter(
      (code) => computePromoCodeStatus(code) === "active"
    ).length;
    const expired = allPromoCodes.filter(
      (code) => computePromoCodeStatus(code) === "expired"
    ).length;
    const inactive = allPromoCodes.filter(
      (code) => computePromoCodeStatus(code) === "inactive"
    ).length;

    const totalDiscountGiven = allUsage.reduce((sum, u) => sum + u.discountApplied, 0);
    const totalUsageCount = allUsage.length;

    return {
      total: allPromoCodes.length,
      active,
      expired,
      inactive,
      totalDiscountGiven,
      totalUsageCount,
    };
  },
});

// ============================================
// PUBLIC MUTATIONS
// ============================================

// Mutation: Validate and apply promo code to cart
// REFACTORED: Uses extracted service functions for cleaner, testable code
export const validatePromoCode = mutation({
  args: {
    code: v.string(),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get cart identifier
    const { userId, sessionId } = await getCartIdentifier(ctx, args.sessionId);

    // Find and validate promo code using extracted service
    const promoCode = await findPromoCodeByCode(ctx, args.code);

    // Validate eligibility (active status, time constraints, usage limits)
    await validatePromoCodeEligibility(ctx, promoCode, userId);

    // Find cart
    const cart = await findCart(ctx, userId, sessionId);

    // Validate cart requirements (minimum order, categories)
    const cartSubtotal = await validateCartRequirements(ctx, promoCode, cart as Cart | null);

    // Calculate discount using extracted function
    const discount = calculatePromoDiscount(promoCode, cartSubtotal);

    // Apply to cart
    await ctx.db.patch(cart!._id, {
      appliedPromoCode: promoCode.code,
      promoDiscount: discount,
      lastModified: Date.now(),
    });

    return {
      success: true,
      code: promoCode.code,
      discount,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      description: promoCode.description,
    };
  },
});

// Mutation: Remove promo code from cart
export const removePromoCode = mutation({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get cart identifier
    const { userId, sessionId } = await getCartIdentifier(ctx, args.sessionId);

    // Find cart
    const cart = await findCart(ctx, userId, sessionId);
    if (!cart) {
      throw cartNotFound();
    }

    // Remove promo code
    await ctx.db.patch(cart._id, {
      appliedPromoCode: undefined,
      promoDiscount: undefined,
      lastModified: Date.now(),
    });

    return { success: true };
  },
});

// ============================================
// ADMIN MUTATIONS
// ============================================

// Mutation: Create new promo code (admin only)
// REFACTORED: Uses extracted validation functions
export const createPromoCode = mutation({
  args: {
    code: v.string(),
    description: v.string(),
    discountType: discountTypeValidator,
    discountValue: v.number(),
    minOrderAmount: v.optional(v.number()),
    maxDiscountAmount: v.optional(v.number()),
    usageLimit: v.optional(v.number()),
    usagePerUser: v.optional(v.number()),
    startsAt: v.number(),
    expiresAt: v.optional(v.number()),
    applicableCategories: v.optional(v.array(v.string())),
    excludeWholesale: v.boolean(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    // Validate and normalize code using extracted function
    const normalizedCode = validatePromoCodeCreation({
      code: args.code,
      discountType: args.discountType,
      discountValue: args.discountValue,
      startsAt: args.startsAt,
      expiresAt: args.expiresAt,
    });

    // Check for duplicate code
    await checkDuplicateCode(ctx, normalizedCode);

    const now = Date.now();

    const promoCodeId = await ctx.db.insert("promoCodes", {
      code: normalizedCode,
      description: args.description,
      discountType: args.discountType,
      discountValue: args.discountValue,
      minOrderAmount: args.minOrderAmount,
      maxDiscountAmount: args.maxDiscountAmount,
      usageLimit: args.usageLimit,
      usagePerUser: args.usagePerUser,
      currentUsageCount: 0,
      startsAt: args.startsAt,
      expiresAt: args.expiresAt,
      applicableCategories: args.applicableCategories,
      excludeWholesale: args.excludeWholesale,
      isActive: args.isActive,
      createdBy: admin.clerkId,
      createdAt: now,
      updatedAt: now,
    });

    return promoCodeId;
  },
});

// Mutation: Update promo code (admin only)
// REFACTORED: Uses extracted validation and shared types
export const updatePromoCode = mutation({
  args: {
    promoCodeId: v.id("promoCodes"),
    description: v.optional(v.string()),
    discountType: v.optional(discountTypeValidator),
    discountValue: v.optional(v.number()),
    minOrderAmount: v.optional(v.number()),
    maxDiscountAmount: v.optional(v.number()),
    usageLimit: v.optional(v.number()),
    usagePerUser: v.optional(v.number()),
    startsAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    applicableCategories: v.optional(v.array(v.string())),
    excludeWholesale: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const promoCode = await ctx.db.get(args.promoCodeId);
    if (!promoCode) {
      throw notFound("Promo code");
    }

    // Build update object
    const updates: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.description !== undefined) updates.description = args.description;
    if (args.discountType !== undefined) updates.discountType = args.discountType;
    if (args.discountValue !== undefined) updates.discountValue = args.discountValue;
    if (args.minOrderAmount !== undefined) updates.minOrderAmount = args.minOrderAmount;
    if (args.maxDiscountAmount !== undefined) updates.maxDiscountAmount = args.maxDiscountAmount;
    if (args.usageLimit !== undefined) updates.usageLimit = args.usageLimit;
    if (args.usagePerUser !== undefined) updates.usagePerUser = args.usagePerUser;
    if (args.startsAt !== undefined) updates.startsAt = args.startsAt;
    if (args.expiresAt !== undefined) updates.expiresAt = args.expiresAt;
    if (args.applicableCategories !== undefined) updates.applicableCategories = args.applicableCategories;
    if (args.excludeWholesale !== undefined) updates.excludeWholesale = args.excludeWholesale;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    // Validate discount value using extracted function
    const discountType = args.discountType ?? promoCode.discountType;
    const discountValue = args.discountValue ?? promoCode.discountValue;
    validateDiscountValue(discountType, discountValue);

    await ctx.db.patch(args.promoCodeId, updates);

    return { success: true };
  },
});

// Mutation: Delete promo code (admin only) - soft delete by setting inactive
export const deletePromoCode = mutation({
  args: {
    promoCodeId: v.id("promoCodes"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const promoCode = await ctx.db.get(args.promoCodeId);
    if (!promoCode) {
      throw notFound("Promo code");
    }

    // Soft delete - just deactivate
    await ctx.db.patch(args.promoCodeId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mutation: Toggle promo code status (admin only)
export const togglePromoCodeStatus = mutation({
  args: {
    promoCodeId: v.id("promoCodes"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const promoCode = await ctx.db.get(args.promoCodeId);
    if (!promoCode) {
      throw notFound("Promo code");
    }

    await ctx.db.patch(args.promoCodeId, {
      isActive: !promoCode.isActive,
      updatedAt: Date.now(),
    });

    return { success: true, isActive: !promoCode.isActive };
  },
});

// ============================================
// INTERNAL FUNCTIONS (for order creation)
// ============================================

// Internal mutation: Record promo code usage (called from orders.ts)
// This MUST be internalMutation to prevent public access to usage manipulation
export const recordPromoCodeUsage = internalMutation({
  args: {
    promoCodeId: v.id("promoCodes"),
    userId: v.string(),
    orderId: v.id("orders"),
    discountApplied: v.number(),
  },
  handler: async (ctx, args) => {
    // Record usage
    await ctx.db.insert("promoCodeUsage", {
      promoCodeId: args.promoCodeId,
      userId: args.userId,
      orderId: args.orderId,
      discountApplied: args.discountApplied,
      usedAt: Date.now(),
    });

    // Increment usage count
    const promoCode = await ctx.db.get(args.promoCodeId);
    if (promoCode) {
      await ctx.db.patch(args.promoCodeId, {
        currentUsageCount: promoCode.currentUsageCount + 1,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Query: Get promo code by code string (for order validation)
export const getPromoCodeByCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedCode = args.code.toUpperCase().trim();
    return ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", normalizedCode))
      .first();
  },
});
