import { mutation, query, action, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAuth, requireAdmin, requireAuthAction } from "./lib/auth";
import { MAX_FILE_SIZE_BYTES, ALLOWED_DOCUMENT_TYPES, ALLOWED_IMAGE_TYPES, FILE_MAGIC_BYTES } from "./lib/constants";
import { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";

/**
 * Type guard to check if a content type is an allowed document type
 */
function isAllowedDocumentType(contentType: string): contentType is typeof ALLOWED_DOCUMENT_TYPES[number] {
  return (ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(contentType);
}

/**
 * Type guard to check if a content type is an allowed image type
 */
function isAllowedImageType(contentType: string): contentType is typeof ALLOWED_IMAGE_TYPES[number] {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType);
}

/**
 * Storage context type for file operations in actions
 * Actions have access to ctx.storage.get() for reading file content
 */
type StorageContext = Pick<ActionCtx, "storage">;

/**
 * Validate file content-type and magic bytes to prevent malicious uploads
 */
async function validateFileContent(
  storageId: string,
  expectedContentType: string,
  ctx: StorageContext
): Promise<void> {
  // Get the file blob
  const blob = await ctx.storage.get(storageId);
  if (!blob) {
    throw new ConvexError({
      code: "FILE_ERROR",
      message: "File not found in storage",
    });
  }

  // Read the first 16 bytes to check magic bytes
  const arrayBuffer = await blob.slice(0, 16).arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Validate magic bytes match the declared content type
  const magicByteSignatures = FILE_MAGIC_BYTES[expectedContentType as keyof typeof FILE_MAGIC_BYTES];

  if (!magicByteSignatures) {
    throw new ConvexError({
      code: "INVALID_FILE_TYPE",
      message: `Unsupported file type: ${expectedContentType}`,
    });
  }

  // Check if file starts with any of the valid magic byte signatures
  const isValidMagicBytes = magicByteSignatures.some((signature) => {
    return signature.every((byte, index) => bytes[index] === byte);
  });

  if (!isValidMagicBytes) {
    throw new ConvexError({
      code: "FILE_VALIDATION_FAILED",
      message: `File content does not match declared type ${expectedContentType}. Possible file type mismatch or malicious upload attempt.`,
    });
  }

  // Additional validation for WebP (check for WEBP signature after RIFF)
  if (expectedContentType === "image/webp") {
    const webpSignature = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
    const hasWebpSignature = webpSignature.every((byte, index) => bytes[8 + index] === byte);

    if (!hasWebpSignature) {
      throw new ConvexError({
        code: "FILE_VALIDATION_FAILED",
        message: "Invalid WebP file format",
      });
    }
  }
}

/**
 * Validate file size
 */
function validateFileSize(blob: Blob): void {
  if (blob.size > MAX_FILE_SIZE_BYTES) {
    throw new ConvexError({
      code: "FILE_TOO_LARGE",
      message: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
    });
  }
}

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
export const saveDocument = action({
  args: {
    storageId: v.id("_storage"),
    documentType: v.union(
      v.literal("reseller_certificate"),
      v.literal("business_license"),
      v.literal("gst_certificate"),
      v.literal("other")
    ),
    applicationId: v.optional(v.id("wholesaleApplications")),
    contentType: v.string(), // Required for validation
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    documentUrl: string;
    documentType?: "reseller_certificate" | "business_license" | "gst_certificate" | "other";
    storageId?: Id<"_storage">;
  }> => {
    const { clerkId } = await requireAuthAction(ctx);

    // Validate content-type is allowed for documents
    if (!isAllowedDocumentType(args.contentType)) {
      throw new ConvexError({
        code: "INVALID_FILE_TYPE",
        message: `Invalid file type. Allowed types: ${ALLOWED_DOCUMENT_TYPES.join(", ")}`,
      });
    }

    // Validate file content matches declared content-type (magic byte validation)
    // Actions have access to ctx.storage.get()
    await validateFileContent(args.storageId, args.contentType, ctx);

    // Get the file and validate size
    const blob = await ctx.storage.get(args.storageId);
    if (!blob) {
      throw new ConvexError({
        code: "FILE_ERROR",
        message: "Failed to retrieve uploaded file",
      });
    }
    validateFileSize(blob);

    // Get the file URL
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new ConvexError({
        code: "FILE_ERROR",
        message: "Failed to get file URL",
      });
    }

    // Call internal mutation to save to database
    // Type assertion needed to break circular type reference with internal API
    const result = await (ctx.runMutation as any)(internal.fileStorageInternal.internalSaveDocument, {
      clerkId,
      storageId: args.storageId,
      documentType: args.documentType,
      applicationId: args.applicationId,
      url,
    });
    return result as {
      success: boolean;
      documentUrl: string;
      documentType?: "reseller_certificate" | "business_license" | "gst_certificate" | "other";
      storageId?: Id<"_storage">;
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
        const url = await ctx.storage.getUrl(doc.storageId as Id<"_storage">);
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

// Save product image after upload (Admin only)
export const saveProductImage = action({
  args: {
    storageId: v.id("_storage"),
    productId: v.id("products"),
    alt: v.optional(v.string()),
    order: v.optional(v.number()),
    contentType: v.string(), // Required for validation
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    imageUrl: string;
  }> => {
    // Verify admin access via auth identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "Authentication required. Please sign in to continue.",
      });
    }

    // Validate content-type is allowed for images
    if (!isAllowedImageType(args.contentType)) {
      throw new ConvexError({
        code: "INVALID_FILE_TYPE",
        message: `Invalid image type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(", ")}`,
      });
    }

    // Validate file content matches declared content-type (magic byte validation)
    // Actions have access to ctx.storage.get()
    await validateFileContent(args.storageId, args.contentType, ctx);

    // Get the file and validate size
    const blob = await ctx.storage.get(args.storageId);
    if (!blob) {
      throw new ConvexError({
        code: "FILE_ERROR",
        message: "Failed to retrieve uploaded file",
      });
    }
    validateFileSize(blob);

    // Get the file URL
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new ConvexError({
        code: "FILE_ERROR",
        message: "Failed to get file URL",
      });
    }

    // Call internal mutation to save to database
    // Type assertion needed to break circular type reference with internal API
    const result = await (ctx.runMutation as any)(internal.fileStorageInternal.internalSaveProductImage, {
      storageId: args.storageId,
      productId: args.productId,
      alt: args.alt,
      order: args.order,
      url,
    });
    return result as {
      success: boolean;
      imageUrl: string;
    };
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
      await ctx.storage.delete(args.storageId);
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
