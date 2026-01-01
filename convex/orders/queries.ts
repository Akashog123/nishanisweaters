import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin, requireOwnershipOrAdmin } from "../lib/auth";

// Shared types and validators
import { orderStatusValidator } from "../lib/types";

// Error factory
import { orderNotFound } from "../lib/errors";

import { getTaxRate, getShippingConfig } from "../lib/getSettings";

// Query: Get user's orders
export const getUserOrders = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user's clerkId from server-side identity (SECURE)
    const { clerkId } = await requireAuth(ctx);

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user_id", (q) => q.eq("userId", clerkId))
      .order("desc")
      .take(args.limit || 50);

    return orders;
  },
});

// Query: Get single order (with ownership verification)
export const getOrder = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);

    if (!order) {
      throw orderNotFound();
    }

    // Verify ownership (admins can view any order)
    await requireOwnershipOrAdmin(ctx, order.userId);

    return order;
  },
});

// Query: Get order by order number (with ownership verification)
export const getOrderByNumber = query({
  args: { orderNumber: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_order_number", (q) => q.eq("orderNumber", args.orderNumber))
      .first();

    if (!order) {
      throw orderNotFound();
    }

    // Verify ownership (admins can view any order)
    await requireOwnershipOrAdmin(ctx, order.userId);

    return order;
  },
});

// Query: List all orders (Admin only)
// Optimized: Uses indexes for status filtering and cursor-based pagination
export const listAllOrders = query({
  args: {
    orderStatus: v.optional(orderStatusValidator),
    orderType: v.optional(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    const limit = args.limit || 50;
    let query;

    // Use appropriate index based on filters
    const orderStatus = args.orderStatus;
    if (orderStatus) {
      // Use compound index by_status_created for status + ordering
      query = ctx.db
        .query("orders")
        .withIndex("by_status_created", (q) => q.eq("orderStatus", orderStatus))
        .order("desc");
    } else {
      // Use by_created_at index for ordering when no status filter
      query = ctx.db
        .query("orders")
        .withIndex("by_created_at")
        .order("desc");
    }

    // Apply pagination
    const paginatedResults = await query.paginate({
      numItems: limit,
      cursor: args.cursor ?? null,
    });

    // Apply orderType filter in memory (less common filter)
    let filteredOrders = paginatedResults.page;
    if (args.orderType) {
      filteredOrders = filteredOrders.filter(o => o.orderType === args.orderType);
    }

    return {
      orders: filteredOrders,
      continueCursor: paginatedResults.continueCursor,
      isDone: paginatedResults.isDone,
    };
  },
});

// Query: Get order status history
// SECURITY: Requires ownership (user can view their own order history) OR admin
export const getOrderStatusHistory = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw orderNotFound();
    }

    // SECURITY: Verify ownership or admin access
    await requireOwnershipOrAdmin(ctx, order.userId);

    return await ctx.db
      .query("orderStatusHistory")
      .withIndex("by_order_id", (q) => q.eq("orderId", args.orderId))
      .order("desc")
      .collect();
  },
});

// Query: Get order preview (calculates totals without creating order)
// SECURITY: Uses server-side identity for pricing
export const getOrderPreview = query({
  args: {
    items: v.array(v.object({
      productId: v.id("products"),
      variantSku: v.string(),
      quantity: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    // Get user info for pricing (optional - guests get retail prices)
    const _user = await (async () => {
      try {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        return await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
          .first();
      } catch {
        return null;
      }
    })();

    // Order type is always retail - bulk pricing is handled at product level
    const orderType = "retail";

    const previewItems = [];
    const errors: string[] = [];

    // OPTIMIZATION: Batch-fetch all products to prevent N+1 queries
    const uniqueProductIds = [...new Set(args.items.map(item => item.productId))];
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

    for (const item of args.items) {
      const product = productsMap.get(item.productId);
      if (!product || !product.isActive) {
        errors.push(`Product not available`);
        continue;
      }

      const variant = product.variants.find(v => v.sku === item.variantSku);
      if (!variant) {
        errors.push(`${product.name}: Size/color not available`);
        continue;
      }

      if (variant.stockQuantity < item.quantity) {
        errors.push(`${product.name}: Only ${variant.stockQuantity} available`);
      }

      const unitPrice = product.retailPrice;

      previewItems.push({
        productId: item.productId,
        name: product.name,
        variantSku: item.variantSku,
        size: variant.size,
        color: variant.color,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice * item.quantity,
        available: variant.stockQuantity >= item.quantity,
      });
    }

    const subtotal = previewItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Get dynamic settings for tax and shipping
    const taxRate = await getTaxRate(ctx);
    const { freeThreshold, standardCost } = await getShippingConfig(ctx);

    const tax = subtotal * taxRate;
    const shippingCost = subtotal >= freeThreshold ? 0 : standardCost;
    const total = subtotal + tax + shippingCost;

    return {
      items: previewItems,
      subtotal,
      tax,
      taxRate,
      shippingCost,
      freeShippingThreshold: freeThreshold,
      total,
      orderType,
      errors,
      isValid: errors.length === 0,
    };
  },
});
