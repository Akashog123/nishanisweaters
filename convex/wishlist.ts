import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth } from "./lib/auth";

// Query: Get user's wishlist
// Optimized: Uses Promise.all for parallel fetches (Convex batches these automatically)
// Added pagination support for large wishlists
// SECURITY: Uses server-side authentication, no client-provided userId
export const getWishlist = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user's clerkId from server-side identity (SECURE)
    const { clerkId } = await requireAuth(ctx);

    const wishlist = await ctx.db
      .query("wishlist")
      .withIndex("by_user_id", (q) => q.eq("userId", clerkId))
      .first();

    if (!wishlist) return null;

    // Apply pagination to prevent fetching too many products at once
    const limit = args.limit || 50;
    const offset = args.offset || 0;
    const paginatedItems = wishlist.items.slice(offset, offset + limit);

    // Batch fetch products using Promise.all
    // Convex automatically optimizes multiple db.get calls in parallel
    // Limit concurrent fetches to avoid overwhelming the system
    const BATCH_SIZE = 25;
    const itemsWithProducts = [];

    for (let i = 0; i < paginatedItems.length; i += BATCH_SIZE) {
      const batch = paginatedItems.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          const product = await ctx.db.get(item.productId);
          return {
            ...item,
            product,
          };
        })
      );
      itemsWithProducts.push(...batchResults);
    }

    return {
      ...wishlist,
      items: itemsWithProducts,
      totalItems: wishlist.items.length,
      hasMore: offset + limit < wishlist.items.length,
    };
  },
});

// Mutation: Add to wishlist
// SECURITY: Uses server-side authentication, no client-provided userId
export const addToWishlist = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    // Get authenticated user's clerkId from server-side identity (SECURE)
    const { clerkId } = await requireAuth(ctx);

    const wishlist = await ctx.db
      .query("wishlist")
      .withIndex("by_user_id", (q) => q.eq("userId", clerkId))
      .first();

    const now = Date.now();
    const newItem = {
      productId: args.productId,
      addedAt: now,
    };

    if (wishlist) {
      // Check if already in wishlist
      const exists = wishlist.items.some(item => item.productId === args.productId);
      if (exists) return wishlist._id;

      await ctx.db.patch(wishlist._id, {
        items: [...wishlist.items, newItem],
        updatedAt: now,
      });
      return wishlist._id;
    } else {
      const wishlistId = await ctx.db.insert("wishlist", {
        userId: clerkId,
        items: [newItem],
        updatedAt: now,
      });
      return wishlistId;
    }
  },
});

// Mutation: Remove from wishlist
// SECURITY: Uses server-side authentication, no client-provided userId
export const removeFromWishlist = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    // Get authenticated user's clerkId from server-side identity (SECURE)
    const { clerkId } = await requireAuth(ctx);

    const wishlist = await ctx.db
      .query("wishlist")
      .withIndex("by_user_id", (q) => q.eq("userId", clerkId))
      .first();

    if (!wishlist) return;

    const updatedItems = wishlist.items.filter(
      item => item.productId !== args.productId
    );

    await ctx.db.patch(wishlist._id, {
      items: updatedItems,
      updatedAt: Date.now(),
    });
  },
});

// Mutation: Clear wishlist
// SECURITY: Uses server-side authentication, no client-provided userId
export const clearWishlist = mutation({
  args: {},
  handler: async (ctx) => {
    // Get authenticated user's clerkId from server-side identity (SECURE)
    const { clerkId } = await requireAuth(ctx);

    const wishlist = await ctx.db
      .query("wishlist")
      .withIndex("by_user_id", (q) => q.eq("userId", clerkId))
      .first();

    if (wishlist) {
      await ctx.db.delete(wishlist._id);
    }
  },
});

// Query: Check if product is in wishlist
// SECURITY: Uses server-side authentication, no client-provided userId
export const isInWishlist = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    // Get authenticated user's clerkId from server-side identity (SECURE)
    const { clerkId } = await requireAuth(ctx);

    const wishlist = await ctx.db
      .query("wishlist")
      .withIndex("by_user_id", (q) => q.eq("userId", clerkId))
      .first();

    if (!wishlist) return false;

    return wishlist.items.some(item => item.productId === args.productId);
  },
});

// Mutation: Save cart item for later (move from cart to wishlist)
// SECURITY: Uses server-side authentication
export const saveForLater = mutation({
  args: {
    productId: v.id("products"),
    variantSku: v.string(),
  },
  handler: async (ctx, args) => {
    const { clerkId } = await requireAuth(ctx);

    // First, add to wishlist
    const wishlist = await ctx.db
      .query("wishlist")
      .withIndex("by_user_id", (q) => q.eq("userId", clerkId))
      .first();

    const now = Date.now();
    const newItem = {
      productId: args.productId,
      addedAt: now,
    };

    if (wishlist) {
      // Check if already in wishlist
      const exists = wishlist.items.some(item => item.productId === args.productId);
      if (!exists) {
        await ctx.db.patch(wishlist._id, {
          items: [...wishlist.items, newItem],
          updatedAt: now,
        });
      }
    } else {
      await ctx.db.insert("wishlist", {
        userId: clerkId,
        items: [newItem],
        updatedAt: now,
      });
    }

    // Then, remove from cart
    const cart = await ctx.db
      .query("cart")
      .withIndex("by_user_id", (q) => q.eq("userId", clerkId))
      .first();

    if (cart) {
      const updatedItems = cart.items.filter(
        item => !(item.productId === args.productId && item.variantSku === args.variantSku)
      );
      await ctx.db.patch(cart._id, {
        items: updatedItems,
        lastModified: now,
      });
    }

    return { success: true };
  },
});

// Mutation: Move item from wishlist back to cart
// SECURITY: Uses server-side authentication
export const moveToCart = mutation({
  args: {
    productId: v.id("products"),
    variantSku: v.string(),
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { clerkId } = await requireAuth(ctx);

    // Get product and variant info
    const product = await ctx.db.get(args.productId);
    if (!product || !product.isActive) {
      throw new Error("Product is not available");
    }

    const variant = product.variants.find(v => v.sku === args.variantSku);
    if (!variant) {
      throw new Error("Variant not found");
    }

    const quantity = args.quantity || 1;
    if (variant.stockQuantity < quantity) {
      throw new Error(`Only ${variant.stockQuantity} items available`);
    }

    const now = Date.now();

    // Add to cart
    const cart = await ctx.db
      .query("cart")
      .withIndex("by_user_id", (q) => q.eq("userId", clerkId))
      .first();

    const cartItem = {
      productId: args.productId,
      variantSku: args.variantSku,
      quantity,
      name: product.name,
      image: product.images[0]?.url || "",
      size: variant.size,
      color: variant.color,
      price: product.retailPrice,
      addedAt: now,
    };

    if (cart) {
      const existingIndex = cart.items.findIndex(
        item => item.productId === args.productId && item.variantSku === args.variantSku
      );

      let updatedItems;
      if (existingIndex >= 0) {
        updatedItems = [...cart.items];
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: Math.min(
            updatedItems[existingIndex].quantity + quantity,
            variant.stockQuantity
          ),
          price: product.retailPrice,
        };
      } else {
        updatedItems = [...cart.items, cartItem];
      }

      await ctx.db.patch(cart._id, {
        items: updatedItems,
        lastModified: now,
      });
    } else {
      await ctx.db.insert("cart", {
        userId: clerkId,
        sessionId: undefined,
        items: [cartItem],
        lastModified: now,
        expiresAt: now + 7 * 24 * 60 * 60 * 1000,
      });
    }

    // Remove from wishlist
    const wishlist = await ctx.db
      .query("wishlist")
      .withIndex("by_user_id", (q) => q.eq("userId", clerkId))
      .first();

    if (wishlist) {
      const updatedItems = wishlist.items.filter(
        item => item.productId !== args.productId
      );
      await ctx.db.patch(wishlist._id, {
        items: updatedItems,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
