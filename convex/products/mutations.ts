import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "../lib/auth";

// Error factory
import { productNotFound } from "../lib/errors";

// Shared types
import { type ProductUpdate } from "../lib/types";

// Local helpers
import { calculatePriceBucket, extractVariantAttributes } from "./helpers";

// Mutation: Create product (Admin only)
export const createProduct = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    shortDescription: v.optional(v.string()),
    category: v.string(),
    subcategory: v.optional(v.string()),
    retailPrice: v.number(),
    wholesalePrice: v.optional(v.number()),
    compareAtPrice: v.optional(v.number()),
    images: v.array(v.object({
      url: v.string(),
      storageId: v.optional(v.string()),
      alt: v.string(),
      order: v.number(),
    })),
    variants: v.array(v.object({
      sku: v.string(),
      size: v.string(),
      color: v.string(),
      colorHex: v.optional(v.string()),
      stockQuantity: v.number(),
      lowStockThreshold: v.number(),
    })),
    tags: v.array(v.string()),
    featured: v.boolean(),
    bestseller: v.boolean(),
    newArrival: v.boolean(),
    minOrderQuantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    const admin = await requireAdmin(ctx);

    const now = Date.now();

    // Calculate hasLowStock flag based on variants
    const hasLowStock = args.variants.some(
      variant => variant.stockQuantity <= variant.lowStockThreshold
    );

    // Calculate denormalized fields for efficient filtering
    const { availableSizes, availableColors } = extractVariantAttributes(args.variants);
    const priceBucket = calculatePriceBucket(args.retailPrice);

    const productId = await ctx.db.insert("products", {
      ...args,
      videos: [],
      costPrice: undefined,
      averageRating: undefined,
      reviewCount: 0,
      isActive: true,
      hasLowStock,
      // Denormalized fields for indexed filtering
      availableSizes,
      availableColors,
      priceBucket,
      createdAt: now,
      updatedAt: now,
      createdBy: admin.clerkId,
    });

    return productId;
  },
});

// Mutation: Update product (Admin only)
export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    shortDescription: v.optional(v.string()),
    category: v.optional(v.string()),
    retailPrice: v.optional(v.number()),
    compareAtPrice: v.optional(v.number()),
    wholesalePrice: v.optional(v.number()),
    images: v.optional(v.array(v.object({
      url: v.string(),
      storageId: v.optional(v.string()),
      alt: v.string(),
      order: v.number(),
    }))),
    variants: v.optional(v.array(v.object({
      sku: v.string(),
      size: v.string(),
      color: v.string(),
      colorHex: v.optional(v.string()),
      stockQuantity: v.number(),
      lowStockThreshold: v.number(),
    }))),
    tags: v.optional(v.array(v.string())),
    featured: v.optional(v.boolean()),
    bestseller: v.optional(v.boolean()),
    newArrival: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    const { productId, ...updates } = args;

    const existingProduct = await ctx.db.get(productId);
    if (!existingProduct) {
      throw productNotFound();
    }

    // Prepare the update object with denormalized fields
    // Using proper ProductUpdate type instead of Record<string, unknown>
    const finalUpdates: ProductUpdate = { ...updates };

    // Recalculate hasLowStock and variant attributes if variants are being updated
    if (updates.variants) {
      finalUpdates.hasLowStock = updates.variants.some(
        variant => variant.stockQuantity <= variant.lowStockThreshold
      );

      // Update denormalized size/color fields
      const { availableSizes, availableColors } = extractVariantAttributes(updates.variants);
      finalUpdates.availableSizes = availableSizes;
      finalUpdates.availableColors = availableColors;
    } else {
      finalUpdates.hasLowStock = existingProduct.hasLowStock;
    }

    // Recalculate price bucket if retail price is being updated
    if (updates.retailPrice !== undefined) {
      finalUpdates.priceBucket = calculatePriceBucket(updates.retailPrice);
    }

    await ctx.db.patch(productId, {
      ...finalUpdates,
      updatedAt: Date.now(),
    });

    return productId;
  },
});

// Mutation: Delete product (Admin only)
export const deleteProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    await ctx.db.patch(args.productId, { isActive: false, updatedAt: Date.now() });
  },
});
