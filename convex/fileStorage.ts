import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAuth, requireAdmin } from "./lib/auth";
import { MAX_FILE_SIZE_BYTES, ALLOWED_DOCUMENT_TYPES, ALLOWED_IMAGE_TYPES } from "./lib/constants";

/**
 * File Storage Utilities for Convex
 * Handles file uploads for wholesale documents and product images
 */

// Generate upload URL for client-side uploads
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    // Require authentication
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Store document reference after upload (for wholesale applications)
export const saveDocument = mutation({
  args: {
    storageId: v.id("_storage"),
    documentType: v.union(
      v.literal("reseller_certificate"),
      v.literal("business_license"),
      v.literal("gst_certificate"),
      v.literal("other")
    ),
    applicationId: v.optional(v.id("wholesaleApplications")),
  },
  handler: async (ctx, args) => {
    const { clerkId } = await requireAuth(ctx);

    // Get the file URL
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new ConvexError({
        code: "FILE_ERROR",
        message: "Failed to get file URL",
      });
    }

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
      if (application.clerkId !== clerkId) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "You can only upload documents to your own application",
        });
      }

      const newDocument = {
        type: args.documentType,
        url,
        storageId: args.storageId,
        uploadedAt: Date.now(),
      };

      const existingDocuments = application.documents || [];
      await ctx.db.patch(args.applicationId, {
        documents: [...existingDocuments, newDocument],
        updatedAt: Date.now(),
      });

      return {
        success: true,
        documentUrl: url,
        documentType: args.documentType,
      };
    }

    // Return the document info for pending applications
    return {
      success: true,
      documentUrl: url,
      storageId: args.storageId,
      documentType: args.documentType,
    };
  },
});

// Get file URL from storage ID
export const getFileUrl = query({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Delete a file from storage
export const deleteFile = mutation({
  args: {
    storageId: v.id("_storage"),
    applicationId: v.optional(v.id("wholesaleApplications")),
  },
  handler: async (ctx, args) => {
    const { clerkId } = await requireAuth(ctx);

    // If tied to an application, remove the reference first
    if (args.applicationId) {
      const application = await ctx.db.get(args.applicationId);
      if (!application) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Application not found",
        });
      }

      // Verify ownership
      if (application.clerkId !== clerkId) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "You can only delete documents from your own application",
        });
      }

      // Remove document from array
      const updatedDocuments = (application.documents || []).filter(
        (doc) => doc.storageId !== args.storageId
      );

      await ctx.db.patch(args.applicationId, {
        documents: updatedDocuments,
        updatedAt: Date.now(),
      });
    }

    // Delete the file from storage
    await ctx.storage.delete(args.storageId);

    return { success: true };
  },
});

// Admin: Get all documents for an application
export const getApplicationDocuments = query({
  args: {
    applicationId: v.id("wholesaleApplications"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Application not found",
      });
    }

    // Get URLs for all documents
    const documentsWithUrls = await Promise.all(
      (application.documents || []).map(async (doc) => {
        const url = await ctx.storage.getUrl(doc.storageId as any);
        return {
          ...doc,
          url: url || doc.url,
        };
      })
    );

    return documentsWithUrls;
  },
});

// ============================================
// PRODUCT IMAGE UPLOADS (Admin only)
// ============================================

// Generate upload URL for admin product uploads
export const generateAdminUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Save product image after upload
export const saveProductImage = mutation({
  args: {
    storageId: v.id("_storage"),
    productId: v.id("products"),
    alt: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Product not found",
      });
    }

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new ConvexError({
        code: "FILE_ERROR",
        message: "Failed to get file URL",
      });
    }

    const newImage = {
      url,
      storageId: args.storageId as unknown as string,
      alt: args.alt || product.name,
      order: args.order ?? product.images.length,
    };

    await ctx.db.patch(args.productId, {
      images: [...product.images, newImage],
      updatedAt: Date.now(),
    });

    return { success: true, imageUrl: url };
  },
});

// Delete product image
export const deleteProductImage = mutation({
  args: {
    productId: v.id("products"),
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Product not found",
      });
    }

    // Remove image from product
    const updatedImages = product.images.filter(
      (img) => img.storageId !== args.storageId
    );

    // Reorder remaining images
    const reorderedImages = updatedImages.map((img, index) => ({
      ...img,
      order: index,
    }));

    await ctx.db.patch(args.productId, {
      images: reorderedImages,
      updatedAt: Date.now(),
    });

    // Delete from storage
    try {
      await ctx.storage.delete(args.storageId as any);
    } catch {
      // Ignore storage deletion errors (file might already be deleted)
    }

    return { success: true };
  },
});

// Reorder product images
export const reorderProductImages = mutation({
  args: {
    productId: v.id("products"),
    imageOrder: v.array(v.object({
      storageId: v.string(),
      order: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Product not found",
      });
    }

    // Update order for each image
    const reorderedImages = product.images.map((img) => {
      const orderInfo = args.imageOrder.find((o) => o.storageId === img.storageId);
      return {
        ...img,
        order: orderInfo?.order ?? img.order,
      };
    }).sort((a, b) => a.order - b.order);

    await ctx.db.patch(args.productId, {
      images: reorderedImages,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ============================================
// PRODUCT YOUTUBE VIDEO MANAGEMENT (Admin only)
// ============================================

// Save YouTube video to product
export const saveYouTubeVideo = mutation({
  args: {
    productId: v.id("products"),
    youtubeId: v.string(),
    title: v.optional(v.string()),
    thumbnail: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Product not found",
      });
    }

    // Validate YouTube ID format (11 characters, alphanumeric with - and _)
    if (!/^[a-zA-Z0-9_-]{11}$/.test(args.youtubeId)) {
      throw new ConvexError({
        code: "INVALID_INPUT",
        message: "Invalid YouTube video ID format. Must be 11 characters.",
      });
    }

    const existingVideos = product.videos || [];

    // Check for duplicates
    if (existingVideos.some((v) => v.youtubeId === args.youtubeId)) {
      throw new ConvexError({
        code: "DUPLICATE",
        message: "This YouTube video is already added to this product",
      });
    }

    const newVideo = {
      youtubeId: args.youtubeId,
      title: args.title,
      thumbnail: args.thumbnail,
      order: existingVideos.length,
    };

    await ctx.db.patch(args.productId, {
      videos: [...existingVideos, newVideo],
      updatedAt: Date.now(),
    });

    return { success: true, video: newVideo };
  },
});

// Delete YouTube video from product
export const deleteYouTubeVideo = mutation({
  args: {
    productId: v.id("products"),
    youtubeId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Product not found",
      });
    }

    const existingVideos = product.videos || [];
    const updatedVideos = existingVideos
      .filter((vid) => vid.youtubeId !== args.youtubeId)
      .map((vid, index) => ({ ...vid, order: index })); // Reorder

    await ctx.db.patch(args.productId, {
      videos: updatedVideos,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Reorder YouTube videos
export const reorderYouTubeVideos = mutation({
  args: {
    productId: v.id("products"),
    videoOrder: v.array(v.object({
      youtubeId: v.string(),
      order: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Product not found",
      });
    }

    const reorderedVideos = (product.videos || [])
      .map((vid) => {
        const orderInfo = args.videoOrder.find((o) => o.youtubeId === vid.youtubeId);
        return { ...vid, order: orderInfo?.order ?? vid.order };
      })
      .sort((a, b) => a.order - b.order);

    await ctx.db.patch(args.productId, {
      videos: reorderedVideos,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
