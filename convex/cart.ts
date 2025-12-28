import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get cart identifier from server-side auth or session
 * For authenticated users, always use server-verified identity.subject
 * For guest users, fall back to sessionId
 */
async function getCartIdentifier(ctx: QueryCtx | MutationCtx, sessionId?: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    // Authenticated user - use server-verified Clerk ID
    return { userId: identity.subject, sessionId: undefined };
  }
  // Guest user - use sessionId
  return { userId: undefined, sessionId };
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
  handler: async (ctx, args) => {
    // Get server-verified user identity - this mutation requires authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication required to merge cart",
      });
    }

    const userId = identity.subject; // Server-verified Clerk ID

    const guestCart = await ctx.db
      .query("cart")
      .withIndex("by_session_id", (q) => q.eq("sessionId", args.sessionId))
      .first();

    if (!guestCart || guestCart.items.length === 0) {
      return;
    }

    const userCart = await ctx.db
      .query("cart")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    // Validate and refresh guest cart items before merging
    const validatedGuestItems = await Promise.all(
      guestCart.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);
        if (!product || !product.isActive) {
          return null; // Skip unavailable products
        }

        const variant = product.variants.find((v) => v.sku === item.variantSku);
        if (!variant) {
          return null; // Skip unavailable variants
        }

        // Limit quantity to available stock
        const validatedQuantity = Math.min(item.quantity, variant.stockQuantity);
        if (validatedQuantity <= 0) {
          return null; // Skip out of stock items
        }

        return {
          ...item,
          quantity: validatedQuantity,
          price: product.retailPrice, // Update to current price
          name: product.name,
          image: product.images[0]?.url || item.image,
        };
      })
    );

    // Filter out null items (unavailable products)
    const validGuestItems = validatedGuestItems.filter(
      (item): item is NonNullable<typeof item> => item !== null
    );

    if (validGuestItems.length === 0) {
      // No valid items to merge, just delete the guest cart
      await ctx.db.delete(guestCart._id);
      return;
    }

    if (userCart) {
      // Merge items
      const mergedItems = [...userCart.items];

      for (const guestItem of validGuestItems) {
        const existingIndex = mergedItems.findIndex(
          (item) =>
            item.productId === guestItem.productId &&
            item.variantSku === guestItem.variantSku
        );

        if (existingIndex >= 0) {
          // Get product to check stock for merged quantity
          const product = await ctx.db.get(guestItem.productId);
          const variant = product?.variants.find(
            (v) => v.sku === guestItem.variantSku
          );
          const maxStock = variant?.stockQuantity || 0;

          // Add quantities, but cap at available stock
          const newQuantity = Math.min(
            mergedItems[existingIndex].quantity + guestItem.quantity,
            maxStock
          );

          mergedItems[existingIndex] = {
            ...mergedItems[existingIndex],
            quantity: newQuantity,
            price: guestItem.price, // Use the refreshed price
          };
        } else {
          mergedItems.push(guestItem);
        }
      }

      await ctx.db.patch(userCart._id, {
        items: mergedItems,
        lastModified: now,
      });

      // Delete guest cart
      await ctx.db.delete(guestCart._id);
    } else {
      // Convert guest cart to user cart with server-verified userId
      await ctx.db.patch(guestCart._id, {
        userId, // Server-verified from identity.subject
        sessionId: undefined,
        items: validGuestItems, // Use validated items
        lastModified: now,
      });
    }
  },
});

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

    const errors: string[] = [];
    const validatedItems = await Promise.all(
      cart.items.map(async (item) => {
        const product = await ctx.db.get(item.productId);

        if (!product || !product.isActive) {
          errors.push(`${item.name} is no longer available`);
          return { ...item, isValid: false };
        }

        const variant = product.variants.find((v) => v.sku === item.variantSku);
        if (!variant) {
          errors.push(`${item.name} (${item.size}/${item.color}) is no longer available`);
          return { ...item, isValid: false };
        }

        if (variant.stockQuantity < item.quantity) {
          if (variant.stockQuantity === 0) {
            errors.push(`${item.name} is out of stock`);
          } else {
            errors.push(
              `Only ${variant.stockQuantity} of ${item.name} available (you have ${item.quantity})`
            );
          }
          return {
            ...item,
            isValid: false,
            maxAvailable: variant.stockQuantity,
          };
        }

        return {
          ...item,
          isValid: true,
          currentPrice: product.retailPrice,
          priceChanged: item.price !== product.retailPrice,
        };
      })
    );

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      items: validatedItems,
    };
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

    const validItems: typeof cart.items = [];
    let removedCount = 0;

    for (const item of cart.items) {
      const product = await ctx.db.get(item.productId);

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
    const expiredCarts = await ctx.db
      .query("cart")
      .filter((q) =>
        q.and(
          q.neq(q.field("expiresAt"), undefined),
          q.lt(q.field("expiresAt"), now)
        )
      )
      .take(100); // Process in batches to avoid timeout

    for (const cart of expiredCarts) {
      await ctx.db.delete(cart._id);
      deletedCount++;
    }

    // Also cleanup empty carts older than 24 hours
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const emptyCarts = await ctx.db
      .query("cart")
      .filter((q) =>
        q.and(
          q.eq(q.field("items"), []),
          q.lt(q.field("lastModified"), oneDayAgo)
        )
      )
      .take(100);

    for (const cart of emptyCarts) {
      await ctx.db.delete(cart._id);
      deletedCount++;
    }

    // Removed console.log - use proper monitoring/logging in production
    return { deletedCount };
  },
});
