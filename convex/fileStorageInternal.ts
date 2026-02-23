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

    // Filter out the placeholder image if it exists
    const existingImages = product.images.filter((img) => img.url !== "/placeholder.svg");

    const newImage = {
      url: args.url,
      storageId: args.storageId as unknown as string,
      alt: args.alt || product.name,
      order: args.order ?? existingImages.length,
    };

    await ctx.db.patch(args.productId, {
      images: [...existingImages, newImage],
      updatedAt: Date.now(),
    });

    return { success: true as const, imageUrl: args.url };
  },
});

// Internal mutation to save category image record to database
export const internalSaveCategoryImage = internalMutation({
  args: {
    storageId: v.id("_storage"),
    categoryId: v.id("categories"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Category not found",
      });
    }

    // If the category already has an image, delete the old one from storage (best effort)
    if (category.imageStorageId && category.imageStorageId !== args.storageId) {
      try {
        await ctx.storage.delete(category.imageStorageId as import("./_generated/dataModel").Id<"_storage">);
      } catch (e) {
        console.error("Failed to delete old category image from storage:", e);
      }
    }

    await ctx.db.patch(args.categoryId, {
      imageUrl: args.url,
      imageStorageId: args.storageId,
      updatedAt: Date.now(),
    });

    return { success: true as const, imageUrl: args.url };
  },
});
