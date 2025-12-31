import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireAdmin, getCurrentUser } from "./lib/auth";

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
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"), v.literal("expired"))),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = args.limit ?? 20;
    const offset = args.offset ?? 0;
    const now = Date.now();

    let promoCodesQuery = ctx.db.query("promoCodes");

    // Get all promo codes (we'll filter in memory for status since it's computed)
    const allPromoCodes = await promoCodesQuery.collect();

    // Filter by computed status
    let filteredPromoCodes = allPromoCodes;
    if (args.status) {
      filteredPromoCodes = allPromoCodes.filter((code) => {
        if (args.status === "expired") {
          return code.expiresAt && code.expiresAt < now;
        }
        if (args.status === "active") {
          return code.isActive && (!code.expiresAt || code.expiresAt >= now);
        }
        if (args.status === "inactive") {
          return !code.isActive;
        }
        return true;
      });
    }

    // Sort by createdAt descending (newest first)
    filteredPromoCodes.sort((a, b) => b.createdAt - a.createdAt);

    // Paginate
    const paginatedPromoCodes = filteredPromoCodes.slice(offset, offset + limit);

    // Add computed fields
    const promoCodesWithStatus = paginatedPromoCodes.map((code) => {
      const isExpired = code.expiresAt ? code.expiresAt < now : false;
      const isLimitReached = code.usageLimit ? code.currentUsageCount >= code.usageLimit : false;

      return {
        ...code,
        isExpired,
        isLimitReached,
        computedStatus: isExpired ? "expired" : !code.isActive ? "inactive" : "active",
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
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Promo code not found",
      });
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

    const now = Date.now();
    const allPromoCodes = await ctx.db.query("promoCodes").collect();
    const allUsage = await ctx.db.query("promoCodeUsage").collect();

    const active = allPromoCodes.filter(
      (code) => code.isActive && (!code.expiresAt || code.expiresAt >= now)
    ).length;
    const expired = allPromoCodes.filter(
      (code) => code.expiresAt && code.expiresAt < now
    ).length;
    const inactive = allPromoCodes.filter((code) => !code.isActive).length;

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
export const validatePromoCode = mutation({
  args: {
    code: v.string(),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get cart identifier
    const { userId, sessionId } = await getCartIdentifier(ctx, args.sessionId);

    // Find the promo code (case-insensitive)
    const normalizedCode = args.code.toUpperCase().trim();
    const promoCode = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", normalizedCode))
      .first();

    // Validate existence
    if (!promoCode) {
      throw new ConvexError({
        code: "INVALID_CODE",
        message: "Invalid promo code",
      });
    }

    // Validate active status
    if (!promoCode.isActive) {
      throw new ConvexError({
        code: "INACTIVE_CODE",
        message: "This promo code is no longer active",
      });
    }

    // Validate time constraints
    const now = Date.now();
    if (promoCode.startsAt > now) {
      throw new ConvexError({
        code: "NOT_STARTED",
        message: "This promo code is not yet valid",
      });
    }
    if (promoCode.expiresAt && promoCode.expiresAt < now) {
      throw new ConvexError({
        code: "EXPIRED",
        message: "This promo code has expired",
      });
    }

    // Validate total usage limit
    if (promoCode.usageLimit && promoCode.currentUsageCount >= promoCode.usageLimit) {
      throw new ConvexError({
        code: "LIMIT_REACHED",
        message: "This promo code has reached its usage limit",
      });
    }

    // Validate per-user usage limit
    if (promoCode.usagePerUser && userId) {
      const userUsage = await ctx.db
        .query("promoCodeUsage")
        .withIndex("by_promo_user", (q) =>
          q.eq("promoCodeId", promoCode._id).eq("userId", userId)
        )
        .collect();

      if (userUsage.length >= promoCode.usagePerUser) {
        throw new ConvexError({
          code: "USER_LIMIT",
          message: "You have already used this promo code",
        });
      }
    }

    // Get cart and validate minimum order amount
    const cart = await findCart(ctx, userId, sessionId);
    if (!cart || cart.items.length === 0) {
      throw new ConvexError({
        code: "EMPTY_CART",
        message: "Your cart is empty",
      });
    }

    // Calculate cart subtotal
    const cartSubtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    if (promoCode.minOrderAmount && cartSubtotal < promoCode.minOrderAmount) {
      throw new ConvexError({
        code: "MIN_NOT_MET",
        message: `Minimum order of ₹${promoCode.minOrderAmount.toLocaleString()} required`,
      });
    }

    // Validate wholesale exclusion
    if (promoCode.excludeWholesale) {
      const user = await getCurrentUser(ctx);
      if (user?.role === "wholesale") {
        throw new ConvexError({
          code: "WHOLESALE_EXCLUDED",
          message: "This promo code is not valid for wholesale orders",
        });
      }
    }

    // Validate category restrictions if applicable
    if (promoCode.applicableCategories && promoCode.applicableCategories.length > 0) {
      // Get all products in cart to check categories
      const productIds = [...new Set(cart.items.map((item) => item.productId))];
      const products = await Promise.all(productIds.map((id) => ctx.db.get(id)));

      const hasApplicableProduct = products.some(
        (product) => product && promoCode.applicableCategories!.includes(product.category)
      );

      if (!hasApplicableProduct) {
        throw new ConvexError({
          code: "CATEGORY_NOT_APPLICABLE",
          message: `This promo code is only valid for: ${promoCode.applicableCategories.join(", ")}`,
        });
      }
    }

    // Calculate discount
    let discount = 0;
    if (promoCode.discountType === "percentage") {
      discount = cartSubtotal * (promoCode.discountValue / 100);
      // Cap at maxDiscountAmount if specified
      if (promoCode.maxDiscountAmount) {
        discount = Math.min(discount, promoCode.maxDiscountAmount);
      }
    } else {
      // Fixed discount - cap at cart subtotal
      discount = Math.min(promoCode.discountValue, cartSubtotal);
    }

    // Round to 2 decimal places
    discount = Math.round(discount * 100) / 100;

    // Apply to cart
    await ctx.db.patch(cart._id, {
      appliedPromoCode: promoCode.code,
      promoDiscount: discount,
      lastModified: now,
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
      throw new ConvexError({
        code: "CART_NOT_FOUND",
        message: "Cart not found",
      });
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
export const createPromoCode = mutation({
  args: {
    code: v.string(),
    description: v.string(),
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
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

    // Normalize and validate code
    const normalizedCode = args.code.toUpperCase().trim();
    if (normalizedCode.length < 3 || normalizedCode.length > 20) {
      throw new ConvexError({
        code: "INVALID_CODE_FORMAT",
        message: "Promo code must be between 3 and 20 characters",
      });
    }

    // Check for duplicate code
    const existingCode = await ctx.db
      .query("promoCodes")
      .withIndex("by_code", (q) => q.eq("code", normalizedCode))
      .first();

    if (existingCode) {
      throw new ConvexError({
        code: "DUPLICATE_CODE",
        message: "A promo code with this code already exists",
      });
    }

    // Validate discount value
    if (args.discountType === "percentage") {
      if (args.discountValue <= 0 || args.discountValue > 100) {
        throw new ConvexError({
          code: "INVALID_DISCOUNT",
          message: "Percentage discount must be between 1 and 100",
        });
      }
    } else {
      if (args.discountValue <= 0) {
        throw new ConvexError({
          code: "INVALID_DISCOUNT",
          message: "Fixed discount must be greater than 0",
        });
      }
    }

    // Validate dates
    if (args.expiresAt && args.expiresAt <= args.startsAt) {
      throw new ConvexError({
        code: "INVALID_DATES",
        message: "Expiry date must be after start date",
      });
    }

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
export const updatePromoCode = mutation({
  args: {
    promoCodeId: v.id("promoCodes"),
    description: v.optional(v.string()),
    discountType: v.optional(v.union(v.literal("percentage"), v.literal("fixed"))),
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
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Promo code not found",
      });
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

    // Validate new discount value if provided
    const discountType = args.discountType ?? promoCode.discountType;
    const discountValue = args.discountValue ?? promoCode.discountValue;

    if (discountType === "percentage") {
      if (discountValue <= 0 || discountValue > 100) {
        throw new ConvexError({
          code: "INVALID_DISCOUNT",
          message: "Percentage discount must be between 1 and 100",
        });
      }
    } else {
      if (discountValue <= 0) {
        throw new ConvexError({
          code: "INVALID_DISCOUNT",
          message: "Fixed discount must be greater than 0",
        });
      }
    }

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
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Promo code not found",
      });
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
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Promo code not found",
      });
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
