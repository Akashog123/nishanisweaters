import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/auth";

// Error factory
import { productNotFound, variantNotFound } from "../lib/errors";

// Shared types
import { stockChangeTypeValidator } from "../lib/types";

// Mutation: Update stock quantity (Admin only)
export const updateStockQuantity = mutation({
  args: {
    productId: v.id("products"),
    variantSku: v.string(),
    quantity: v.number(),
    changeType: stockChangeTypeValidator,
    reason: v.optional(v.string()),
    orderId: v.optional(v.id("orders")),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    const admin = await requireAdmin(ctx);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw productNotFound();
    }

    const variantIndex = product.variants.findIndex(v => v.sku === args.variantSku);
    if (variantIndex === -1) {
      throw variantNotFound();
    }

    const variant = product.variants[variantIndex];
    const quantityBefore = variant.stockQuantity;
    const quantityAfter = quantityBefore + args.quantity;

    // Update variant stock
    const updatedVariants = [...product.variants];
    updatedVariants[variantIndex] = {
      ...variant,
      stockQuantity: quantityAfter,
    };

    // Recalculate hasLowStock flag based on updated variants
    const hasLowStock = updatedVariants.some(
      v => v.stockQuantity <= v.lowStockThreshold
    );

    await ctx.db.patch(args.productId, {
      variants: updatedVariants,
      hasLowStock,
      updatedAt: Date.now(),
    });

    // Log the inventory change
    await ctx.db.insert("inventoryLogs", {
      productId: args.productId,
      variantSku: args.variantSku,
      changeType: args.changeType,
      quantityBefore,
      quantityChange: args.quantity,
      quantityAfter,
      reason: args.reason,
      orderId: args.orderId,
      changedBy: admin.clerkId,
      timestamp: Date.now(),
    });

    return { quantityBefore, quantityAfter };
  },
});
