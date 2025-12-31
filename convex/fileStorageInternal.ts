import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

/**
 * Internal mutations for file storage operations
 * These are called by actions in fileStorage.ts after file validation
 * Separated to avoid circular type references
 */

// Internal mutation to save document record to database
export const internalSaveDocument = internalMutation({
  args: {
    clerkId: v.string(),
    storageId: v.id("_storage"),
    documentType: v.union(
      v.literal("reseller_certificate"),
      v.literal("business_license"),
      v.literal("gst_certificate"),
      v.literal("other")
    ),
    applicationId: v.optional(v.id("wholesaleApplications")),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    // If applicationId provided, update the application with the document
    if (args.applicationId) {
      const application = await ctx.db.get(args.applicationId);
      if (!application) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      // Verify ownership
      if (application.clerkId !== args.clerkId) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "You can only upload documents to your own application",
        });
      }

      const newDocument = {
        type: args.documentType,
        url: args.url,
        storageId: args.storageId,
        uploadedAt: Date.now(),
      };

      const existingDocuments = application.documents || [];
      await ctx.db.patch(args.applicationId, {
        documents: [...existingDocuments, newDocument],
        updatedAt: Date.now(),
      });

      return {
        success: true as const,
        documentUrl: args.url,
        documentType: args.documentType,
      };
    }

    // Return the document info for pending applications
    return {
      success: true as const,
      documentUrl: args.url,
      storageId: args.storageId,
      documentType: args.documentType,
    };
  },
});

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
