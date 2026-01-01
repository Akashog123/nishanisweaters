import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

/**
 * Internal mutations for file storage operations
 * These are called by actions in fileStorage.ts after file validation
 * Separated to avoid circular type references
 */

// Internal mutation to save product image record to database
export const internalSaveProductImage = internalMutation({
  args: {
    storageId: v.id("_storage"),
    productId: v.id("products"),
    alt: v.optional(v.string()),
    order: v.optional(v.number()),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Product not found",
      });
    }

    const newImage = {
      url: args.url,
      storageId: args.storageId as unknown as string,
      alt: args.alt || product.name,
      order: args.order ?? product.images.length,
    };

    await ctx.db.patch(args.productId, {
      images: [...product.images, newImage],
      updatedAt: Date.now(),
    });

    return { success: true as const, imageUrl: args.url };
  },
});
