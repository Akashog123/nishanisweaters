import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";
import { ConvexError } from "convex/values";

/**
 * CMS Content Management
 * Handles banners, announcements, and other dynamic content
 */

// Content types
const contentTypeValidator = v.union(
  v.literal("banner"),
  v.literal("announcement"),
  v.literal("text_block"),
  v.literal("image"),
  v.literal("video")
);

// ============================================
// PUBLIC QUERIES (for frontend display)
// ============================================

// Get active content by key
export const getContent = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const content = await ctx.db
      .query("cmsContent")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (!content || !content.isActive) {
      return null;
    }

    // Check date restrictions
    const now = Date.now();
    if (content.startsAt && now < content.startsAt) {
      return null;
    }
    if (content.endsAt && now > content.endsAt) {
      return null;
    }

    return content;
  },
});

// Get all active content by type
export const getContentByType = query({
  args: {
    type: contentTypeValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const allContent = await ctx.db
      .query("cmsContent")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .collect();

    // Filter for active and date-valid content
    return allContent
      .filter((c) => {
        if (!c.isActive) return false;
        if (c.startsAt && now < c.startsAt) return false;
        if (c.endsAt && now > c.endsAt) return false;
        return true;
      })
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  },
});

// Get all active banners
export const getActiveBanners = query({
  handler: async (ctx) => {
    const now = Date.now();

    const banners = await ctx.db
      .query("cmsContent")
      .withIndex("by_type", (q) => q.eq("type", "banner"))
      .collect();

    return banners
      .filter((b) => {
        if (!b.isActive) return false;
        if (b.startsAt && now < b.startsAt) return false;
        if (b.endsAt && now > b.endsAt) return false;
        return true;
      })
      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  },
});

// Get announcement bar content
export const getAnnouncement = query({
  handler: async (ctx) => {
    const now = Date.now();

    const announcement = await ctx.db
      .query("cmsContent")
      .withIndex("by_type", (q) => q.eq("type", "announcement"))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!announcement) return null;

    // Check date restrictions
    if (announcement.startsAt && now < announcement.startsAt) {
      return null;
    }
    if (announcement.endsAt && now > announcement.endsAt) {
      return null;
    }

    return announcement;
  },
});

// ============================================
// ADMIN QUERIES
// ============================================

// List all CMS content (Admin only)
export const listAllContent = query({
  args: {
    type: v.optional(contentTypeValidator),
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let query;
    if (args.type) {
      query = ctx.db
        .query("cmsContent")
        .withIndex("by_type", (q) => q.eq("type", args.type as any));
    } else {
      query = ctx.db.query("cmsContent");
    }

    const allContent = await query.order("desc").collect();

    if (args.includeInactive) {
      return allContent;
    }

    return allContent;
  },
});

// Get single content item (Admin only)
export const getContentById = query({
  args: {
    contentId: v.id("cmsContent"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.get(args.contentId);
  },
});

// ============================================
// ADMIN MUTATIONS
// ============================================

// Create new CMS content (Admin only)
export const createContent = mutation({
  args: {
    key: v.string(),
    type: contentTypeValidator,
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    ctaLink: v.optional(v.string()),
    isActive: v.boolean(),
    displayOrder: v.optional(v.number()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    // Check for duplicate key
    const existing = await ctx.db
      .query("cmsContent")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: `Content with key "${args.key}" already exists`,
      });
    }

    const now = Date.now();

    const contentId = await ctx.db.insert("cmsContent", {
      ...args,
      updatedBy: admin.clerkId,
      createdAt: now,
      updatedAt: now,
    });

    return contentId;
  },
});

// Update CMS content (Admin only)
export const updateContent = mutation({
  args: {
    contentId: v.id("cmsContent"),
    key: v.optional(v.string()),
    type: v.optional(contentTypeValidator),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    imageStorageId: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    ctaLink: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    displayOrder: v.optional(v.number()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const existing = await ctx.db.get(args.contentId);
    if (!existing) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Content not found",
      });
    }

    // Check for duplicate key if key is being changed
    if (args.key && args.key !== existing.key) {
      const duplicate = await ctx.db
        .query("cmsContent")
        .withIndex("by_key", (q) => q.eq("key", args.key as string))
        .first();

      if (duplicate) {
        throw new ConvexError({
          code: "VALIDATION_ERROR",
          message: `Content with key "${args.key}" already exists`,
        });
      }
    }

    const { contentId, ...updates } = args;

    await ctx.db.patch(contentId, {
      ...updates,
      updatedBy: admin.clerkId,
      updatedAt: Date.now(),
    });
  },
});

// Delete CMS content (Admin only)
export const deleteContent = mutation({
  args: {
    contentId: v.id("cmsContent"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const existing = await ctx.db.get(args.contentId);
    if (!existing) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Content not found",
      });
    }

    // Delete associated storage file if exists
    if (existing.imageStorageId) {
      try {
        await ctx.storage.delete(existing.imageStorageId as any);
      } catch {
        // Ignore storage deletion errors
      }
    }

    await ctx.db.delete(args.contentId);
  },
});

// Toggle content active status (Admin only)
export const toggleActive = mutation({
  args: {
    contentId: v.id("cmsContent"),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);

    const existing = await ctx.db.get(args.contentId);
    if (!existing) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Content not found",
      });
    }

    await ctx.db.patch(args.contentId, {
      isActive: !existing.isActive,
      updatedBy: admin.clerkId,
      updatedAt: Date.now(),
    });

    return !existing.isActive;
  },
});

// Reorder content (Admin only)
export const reorderContent = mutation({
  args: {
    items: v.array(v.object({
      contentId: v.id("cmsContent"),
      displayOrder: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const now = Date.now();

    for (const item of args.items) {
      await ctx.db.patch(item.contentId, {
        displayOrder: item.displayOrder,
        updatedBy: admin.clerkId,
        updatedAt: now,
      });
    }
  },
});
