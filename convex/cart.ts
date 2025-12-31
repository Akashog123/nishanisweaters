import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import {
  validateCartItems,
  validateCartForCheckout,
  mergeCartItems,
  calculateCartExpiration,
  type CartItem,
} from "./lib/cartUtils";
import { validateSessionId } from "./lib/validation";

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get cart identifier from server-side auth or session
 * For authenticated users, always use server-verified identity.subject
 * For guest users, fall back to sessionId (with format validation)
 */
async function getCartIdentifier(ctx: QueryCtx | MutationCtx, sessionId?: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    // Authenticated user - use server-verified Clerk ID
    return { userId: identity.subject, sessionId: undefined };
  }
  // Guest user - validate and use sessionId
  // Session IDs must be valid UUID v4 format to prevent injection attacks
  const validatedSessionId = validateSessionId(sessionId);
  return { userId: undefined, sessionId: validatedSessionId };
}

/**
 * Find cart by user ID or session ID
 * Centralized cart lookup to avoid code duplication
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
// QUERIES
// ============================================

// Query: Get user's cart with fresh product data
export const getCart = query({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get cart identifier from server-side auth or session
    const { userId, sessionId } = await getCartIdentifier(ctx, args.sessionId);

    // Find cart using server-verified identity
    const cart = await findCart(ctx, userId, sessionId);

    if (!cart) {
      return null;
    }

    // STALENESS CHECK: Immediately detect expired carts without waiting for cron job
    // This provides real-time staleness detection (cron runs every 6 hours)
    const isExpired = cart.expiresAt < Date.now();
    if (isExpired) {
      return {
        ...cart,
        items: [],
        isExpired: true,
      };
    }

    // Batch fetch all products at once to avoid N+1 query problem
    const uniqueProductIds = [...new Set(cart.items.map((item) => item.productId))];
    const products = await Promise.all(
      uniqueProductIds.map((id) => ctx.db.get(id))
    );

    // Create a lookup map for O(1) access
    const productMap = new Map(
      uniqueProductIds.map((id, index) => [id, products[index]])
    );

    // Refresh cart items with current product data (prices, availability)
    const refreshedItems = cart.items.map((item) => {
      const product = productMap.get(item.productId);

      // If product no longer exists or is inactive, mark as unavailable
      if (!product || !product.isActive) {
        return {
          ...item,
          isAvailable: false,
          unavailableReason: "Product no longer available",
          currentPrice: item.price,
        };
      }

      // Find the variant
      const variant = product.variants.find((v) => v.sku === item.variantSku);
      if (!variant) {
        return {
          ...item,
          isAvailable: false,
          unavailableReason: "Size/color combination no longer available",
          currentPrice: product.retailPrice,
        };
      }

      // Check stock
      const isInStock = variant.stockQuantity >= item.quantity;
      const maxAvailable = variant.stockQuantity;

      // Check if price has changed
      const priceChanged = item.price !== product.retailPrice;

      return {
        ...item,
        name: product.name, // Update name in case it changed
        image: product.images[0]?.url || item.image, // Update image
        price: product.retailPrice, // Always use current price
        originalPrice: priceChanged ? item.price : undefined, // Track if price changed
        isAvailable: true,
        isInStock,
        maxAvailable,
        priceChanged,
      };
    });

    return {
      ...cart,
      items: refreshedItems,
      isExpired: false,
    };
  },
});

// Query: Get cart item count (lightweight query for header)
export const getCartItemCount = query({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get cart identifier from server-side auth or session
    const { userId, sessionId } = await getCartIdentifier(ctx, args.sessionId);

    // Find cart using server-verified identity
    const cart = await findCart(ctx, userId, sessionId);

    if (!cart) {
      return 0;
    }

    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  },
});

// ============================================
// MUTATIONS
// ============================================

// Mutation: Add item to cart
export const addToCart = mutation({
  args: {
    sessionId: v.optional(v.string()),
    productId: v.id("products"),
    variantSku: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // Get cart identifier from server-side auth or session
    const { userId, sessionId } = await getCartIdentifier(ctx, args.sessionId);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError({
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found",
      });
    }

    if (!product.isActive) {
      throw new ConvexError({
        code: "PRODUCT_UNAVAILABLE",
        message: "Product is no longer available",
      });
    }

    const variant = product.variants.find((v) => v.sku === args.variantSku);
    if (!variant) {
      throw new ConvexError({
        code: "VARIANT_NOT_FOUND",
        message: "Variant not found",
      });
    }

    // Find existing cart using server-verified identity
    const cart = await findCart(ctx, userId, sessionId);

    // Calculate total quantity including existing cart items
    let totalQuantity = args.quantity;
    if (cart) {
      const existingItem = cart.items.find(
        (item) =>
          item.productId === args.productId &&
          item.variantSku === args.variantSku
      );
      if (existingItem) {
        totalQuantity += existingItem.quantity;
      }
    }

    // Check stock with total quantity
    if (variant.stockQuantity < totalQuantity) {
      throw new ConvexError({
        code: "INSUFFICIENT_STOCK",
        message: `Insufficient stock. Only ${variant.stockQuantity} available.`,
      });
    }

    const now = Date.now();
    const newItem = {
      productId: args.productId,
      variantSku: args.variantSku,
      quantity: args.quantity,
      name: product.name,
      image: product.images[0]?.url || "",
      size: variant.size,
      color: variant.color,
      price: product.retailPrice,
      addedAt: now,
    };

    if (cart) {
      // Check if item already exists in cart
      const existingItemIndex = cart.items.findIndex(
        (item) =>
          item.productId === args.productId &&
          item.variantSku === args.variantSku
      );

      let updatedItems;
      if (existingItemIndex >= 0) {
        // Update quantity
        updatedItems = [...cart.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + args.quantity,
          // Update price in case it changed
          price: product.retailPrice,
        };
      } else {
        // Add new item
        updatedItems = [...cart.items, newItem];
      }

      await ctx.db.patch(cart._id, {
        items: updatedItems,
        lastModified: now,
        expiresAt: now + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return cart._id;
    } else {
      // Create new cart with server-verified userId
      const cartId = await ctx.db.insert("cart", {
        userId,
        sessionId,
        items: [newItem],
        lastModified: now,
        expiresAt: now + 7 * 24 * 60 * 60 * 1000,
      });

      return cartId;
    }
  },
});

// Mutation: Update cart item quantity
export const updateCartItem = mutation({
  args: {
    sessionId: v.optional(v.string()),
    productId: v.id("products"),
    variantSku: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    // Get cart identifier from server-side auth or session
    const { userId, sessionId } = await getCartIdentifier(ctx, args.sessionId);

    // Find cart using server-verified identity
    const cart = await findCart(ctx, userId, sessionId);

    if (!cart) {
      throw new ConvexError({
        code: "CART_NOT_FOUND",
        message: "Cart not found",
      });
    }

    const now = Date.now();

    if (args.quantity <= 0) {
      // Remove item
      const updatedItems = cart.items.filter(
        (item) =>
          !(
            item.productId === args.productId &&
            item.variantSku === args.variantSku
          )
      );
      await ctx.db.patch(cart._id, {
        items: updatedItems,
        lastModified: now,
      });
    } else {
      // Verify stock before updating
      const product = await ctx.db.get(args.productId);
      if (!product) {
        throw new ConvexError({
          code: "PRODUCT_NOT_FOUND",
          message: "Product not found",
        });
      }

      if (!product.isActive) {
        throw new ConvexError({
          code: "PRODUCT_UNAVAILABLE",
          message: "Product is no longer available",
        });
      }

      const variant = product.variants.find((v) => v.sku === args.variantSku);
      if (!variant) {
        throw new ConvexError({
          code: "VARIANT_NOT_FOUND",
          message: "Variant not found",
        });
      }

      if (variant.stockQuantity < args.quantity) {
        throw new ConvexError({
          code: "INSUFFICIENT_STOCK",
          message: `Insufficient stock. Only ${variant.stockQuantity} available.`,
        });
      }

      // Update quantity with fresh price
      const updatedItems = cart.items.map((item) => {
        if (
          item.productId === args.productId &&
          item.variantSku === args.variantSku
        ) {
          return {
            ...item,
            quantity: args.quantity,
            price: product.retailPrice, // Update to current price
          };
        }
        return item;
      });
      await ctx.db.patch(cart._id, {
        items: updatedItems,
        lastModified: now,
      });
    }
  },
});

// Mutation: Remove cart item
export const removeCartItem = mutation({
  args: {
    sessionId: v.optional(v.string()),
    productId: v.id("products"),
    variantSku: v.string(),
  },
  handler: async (ctx, args) => {
    // Get cart identifier from server-side auth or session
    const { userId, sessionId } = await getCartIdentifier(ctx, args.sessionId);

    // Find cart using server-verified identity
    const cart = await findCart(ctx, userId, sessionId);

    if (!cart) {
      throw new ConvexError({
        code: "CART_NOT_FOUND",
        message: "Cart not found",
      });
    }

    const updatedItems = cart.items.filter(
      (item) =>
        !(
          item.productId === args.productId &&
          item.variantSku === args.variantSku
        )
    );

    await ctx.db.patch(cart._id, {
      items: updatedItems,
      lastModified: Date.now(),
    });
  },
});

// Mutation: Clear cart
export const clearCart = mutation({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get cart identifier from server-side auth or session
    const { userId, sessionId } = await getCartIdentifier(ctx, args.sessionId);

    // Find cart using server-verified identity
    const cart = await findCart(ctx, userId, sessionId);

    if (cart) {
      await ctx.db.delete(cart._id);
    }
  },
});

// Mutation: Merge guest cart with user cart (on login)
export const mergeGuestCart = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args): Promise<{ merged: boolean; itemCount: number } | null> => {
    // Get server-verified user identity - this mutation requires authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication required to merge cart",
      });
    }

    const userId = identity.subject; // Server-verified Clerk ID

    // Fetch guest cart - early return if empty or non-existent
    const guestCart = await ctx.db
      .query("cart")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!guestCart || guestCart.items.length === 0) {
      // No guest cart or empty - nothing to merge
      return { merged: false, itemCount: 0 };
    }

    // Validate and refresh guest cart items before merging
    const validGuestItems = await validateCartItems(
      ctx,
      guestCart.items as CartItem[]
    );

    // No valid items to merge - cleanup and return
    if (validGuestItems.length === 0) {
      await ctx.db.delete(guestCart._id);
      return { merged: false, itemCount: 0 };
    }

    // Fetch user's existing cart
    const userCart = await ctx.db
      .query("cart")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();
    const itemCount = validGuestItems.length;

    // Handle merge based on whether user has existing cart
    await handleCartMerge(ctx, {
      userCart,
      guestCart,
      validGuestItems,
      userId,
      now,
    });

    // Return info about what was merged
    return { merged: true, itemCount };
  },
});

/**
 * Handles the actual cart merge operation.
 * Extracted to reduce nesting in mergeGuestCart handler.
 */
async function handleCartMerge(
  ctx: MutationCtx,
  options: {
    userCart: Doc<"cart"> | null;
    guestCart: Doc<"cart">;
    validGuestItems: CartItem[];
    userId: string;
    now: number;
  }
) {
  const { userCart, guestCart, validGuestItems, userId, now } = options;

  // User has existing cart - merge items
  if (userCart) {
    const mergedItems = await mergeCartItems(
      ctx,
      userCart.items as CartItem[],
      validGuestItems
    );

    await ctx.db.patch(userCart._id, {
      items: mergedItems,
      lastModified: now,
    });

    // Delete guest cart after successful merge
    await ctx.db.delete(guestCart._id);
    return;
  }

  // User has no cart - convert guest cart to user cart
  await ctx.db.patch(guestCart._id, {
    userId, // Server-verified from identity.subject
    sessionId: undefined,
    items: validGuestItems,
    lastModified: now,
  });
}

// Mutation: Validate cart before checkout
export const validateCart = mutation({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get cart identifier from server-side auth or session
    const { userId, sessionId } = await getCartIdentifier(ctx, args.sessionId);

    // Find cart using server-verified identity
    const cart = await findCart(ctx, userId, sessionId);

    if (!cart || cart.items.length === 0) {
      return {
        isValid: false,
        errors: ["Cart is empty"],
        items: [],
      };
    }

    // Use helper function for validation logic
    return validateCartForCheckout(ctx, cart.items as CartItem[]);
  },
});

// Mutation: Remove unavailable items from cart
export const removeUnavailableItems = mutation({
  args: {
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get cart identifier from server-side auth or session
    const { userId, sessionId } = await getCartIdentifier(ctx, args.sessionId);

    // Find cart using server-verified identity
    const cart = await findCart(ctx, userId, sessionId);

    if (!cart) {
      return { removed: 0 };
    }

    // OPTIMIZATION: Batch-fetch all products to prevent N+1 queries
    // Instead of fetching each product inside the loop, we fetch all at once
    const uniqueProductIds = [...new Set(cart.items.map(item => item.productId))];
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

    const validItems: typeof cart.items = [];
    let removedCount = 0;

    for (const item of cart.items) {
      const product = productsMap.get(item.productId); // O(1) lookup instead of O(n) queries

      if (!product || !product.isActive) {
        removedCount++;
        continue;
      }

      const variant = product.variants.find((v) => v.sku === item.variantSku);
      if (!variant || variant.stockQuantity === 0) {
        removedCount++;
        continue;
      }

      // Adjust quantity if needed
      const adjustedQuantity = Math.min(item.quantity, variant.stockQuantity);
      validItems.push({
        ...item,
        quantity: adjustedQuantity,
        price: product.retailPrice, // Update to current price
      });
    }

    if (removedCount > 0 || validItems.length !== cart.items.length) {
      await ctx.db.patch(cart._id, {
        items: validItems,
        lastModified: Date.now(),
      });
    }

    return { removed: removedCount };
  },
});

// ============================================
// INTERNAL MUTATIONS (for cron jobs)
// ============================================

// Internal mutation: Cleanup expired guest carts
// Called by cron job every 6 hours
export const cleanupExpiredCarts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let deletedCount = 0;

    // Find all expired carts (guest carts older than 7 days)
    // PERFORMANCE: Batch size of 500 balances throughput with timeout risk
    // For high-traffic sites, this processes ~2000 carts/day (500 per 6-hour run)
    const expiredCarts = await ctx.db
      .query("cart")
      .filter((q) =>
        q.and(
          q.neq(q.field("expiresAt"), undefined),
          q.lt(q.field("expiresAt"), now)
        )
      )
      .take(500);

    for (const cart of expiredCarts) {
      await ctx.db.delete(cart._id);
      deletedCount++;
    }

    // Also cleanup empty carts older than 24 hours
    // PERFORMANCE: Batch size of 500 ensures efficient cleanup of abandoned empty carts
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const emptyCarts = await ctx.db
      .query("cart")
      .filter((q) =>
        q.and(
          q.eq(q.field("items"), []),
          q.lt(q.field("lastModified"), oneDayAgo)
        )
      )
      .take(500);

    for (const cart of emptyCarts) {
      await ctx.db.delete(cart._id);
      deletedCount++;
    }

    // Removed console.log - use proper monitoring/logging in production
    return { deletedCount };
  },
});
