/**
 * Categories API - Admin-managed product categories
 *
 * This module provides:
 * - Public queries for fetching active categories
 * - Admin queries for listing all categories
 * - Admin mutations for CRUD operations
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib/auth";

// ============================================
// PUBLIC QUERIES (no auth required)
// ============================================

/**
 * Get categories for header navigation
 * Returns only active categories marked to show in header
 */
export const getHeaderCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter for showInHeader and sort by displayOrder
    return categories
      .filter((cat) => cat.showInHeader)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  },
});

/**
 * Get all active categories (for product filters, dropdowns, etc.)
 */
export const getActiveCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();

    return categories.sort((a, b) => a.displayOrder - b.displayOrder);
  },
});

/**
 * Get a single category by slug
 */
export const getCategoryBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// ============================================
// ADMIN QUERIES
// ============================================

/**
 * List all categories (admin only)
 */
export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const categories = await ctx.db.query("categories").collect();

    // Sort by displayOrder
    return categories.sort((a, b) => a.displayOrder - b.displayOrder);
  },
});

/**
 * Get category statistics (product counts)
 * Uses per-category indexed queries instead of loading all products
 */
export const getCategoryStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const categories = await ctx.db.query("categories").collect();

    // Query products per category using index instead of loading all products
    const stats = await Promise.all(
      categories.map(async (category) => {
        const products = await ctx.db
          .query("products")
          .withIndex("by_category", (q) => q.eq("category", category.slug))
          .collect();

        const productCount = products.length;
        const activeProductCount = products.filter((p) => p.isActive).length;

        return {
          ...category,
          productCount,
          activeProductCount,
        };
      })
    );

    return stats.sort((a, b) => a.displayOrder - b.displayOrder);
  },
});

// ============================================
// ADMIN MUTATIONS
// ============================================

/**
 * Create a new category
 */
export const createCategory = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.string()),
    showInHeader: v.boolean(),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    // Validate slug format (lowercase, alphanumeric, hyphens only)
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(args.slug)) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message:
          "Slug must contain only lowercase letters, numbers, and hyphens",
      });
    }

    // Check for duplicate slug
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (existing) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "A category with this slug already exists",
      });
    }

    // Resolve the actual Convex storage URL from the storageId
    let imageUrl = args.imageUrl;
    if (args.imageStorageId) {
      const resolvedUrl = await ctx.storage.getUrl(args.imageStorageId as Id<"_storage">);
      if (resolvedUrl) {
        imageUrl = resolvedUrl;
      }
    }

    const now = Date.now();
    const categoryId = await ctx.db.insert("categories", {
      name: args.name,
      slug: args.slug,
      description: args.description,
      imageUrl,
      imageStorageId: args.imageStorageId,
      isActive: true,
      showInHeader: args.showInHeader,
      displayOrder: args.displayOrder,
      createdAt: now,
      updatedAt: now,
      createdBy: admin.clerkId,
    });

    // Return the created category for proper client-side query invalidation
    return await ctx.db.get(categoryId);
  },
});

/**
 * Update an existing category
 */
export const updateCategory = mutation({
  args: {
    id: v.id("categories"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    showInHeader: v.optional(v.boolean()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { id, ...updates } = args;
    const category = await ctx.db.get(id);

    if (!category) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Category not found",
      });
    }

    // Validate slug if changing
    if (updates.slug && updates.slug !== category.slug) {
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(updates.slug)) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message:
            "Slug must contain only lowercase letters, numbers, and hyphens",
        });
      }

      // Check for duplicate slug
      const existing = await ctx.db
        .query("categories")
        .withIndex("by_slug", (q) => q.eq("slug", updates.slug!))
        .first();

      if (existing) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: "A category with this slug already exists",
        });
      }
    }

    // Build update object with only defined values
    const updateData: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.slug !== undefined) updateData.slug = updates.slug;
    if (updates.description !== undefined)
      updateData.description = updates.description;

    if (updates.imageStorageId !== undefined) {
      if (updates.imageStorageId && updates.imageStorageId !== category.imageStorageId) {
        updateData.imageStorageId = updates.imageStorageId;
        const resolvedUrl = await ctx.storage.getUrl(updates.imageStorageId as Id<"_storage">);
        if (resolvedUrl) {
          updateData.imageUrl = resolvedUrl;
        }
      } else if (!updates.imageStorageId) {
        updateData.imageStorageId = undefined;
        updateData.imageUrl = undefined;
      }

    } else if (updates.imageUrl !== undefined) {
      updateData.imageUrl = updates.imageUrl;
    }
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.showInHeader !== undefined)
      updateData.showInHeader = updates.showInHeader;
    if (updates.displayOrder !== undefined)
      updateData.displayOrder = updates.displayOrder;

    await ctx.db.patch(id, updateData);

    return await ctx.db.get(id);
  },
});

/**
 * Delete a category
 */
export const deleteCategory = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Category not found",
      });
    }

    // Check if any products use this category
    const productsWithCategory = await ctx.db
      .query("products")
      .withIndex("by_category", (q) => q.eq("category", category.slug))
      .first();

    if (productsWithCategory) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message:
          "Cannot delete category with existing products. Reassign products first.",
      });
    }

    await ctx.db.delete(args.id);
  },
});

/**
 * Reorder categories (update display order for multiple categories)
 */
export const reorderCategories = mutation({
  args: {
    orderedIds: v.array(v.id("categories")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Update display order for each category
    for (let i = 0; i < args.orderedIds.length; i++) {
      await ctx.db.patch(args.orderedIds[i], {
        displayOrder: i + 1,
        updatedAt: Date.now(),
      });
    }

    // Return the reordered categories for proper client-side query invalidation
    const reordered = await Promise.all(
      args.orderedIds.map(id => ctx.db.get(id))
    );
    return reordered;
  },
});
