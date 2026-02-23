import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/auth";

/**
 * Get all active testimonials ordered by displayOrder
 * Used by the frontend to display testimonials
 */
export const getActiveTestimonials = query({
  args: {},
  handler: async (ctx) => {
    const testimonials = await ctx.db
      .query("testimonials")
      .withIndex("by_active_order", (q) => q.eq("isActive", true))
      .order("asc")
      .collect();

    return testimonials;
  },
});

/**
 * Get all testimonials (admin only)
 */
export const getAllTestimonials = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const testimonials = await ctx.db
      .query("testimonials")
      .order("desc")
      .collect();

    return testimonials;
  },
});

/**
 * Create a new testimonial (admin only)
 */
export const createTestimonial = mutation({
  args: {
    quote: v.string(),
    author: v.string(),
    role: v.string(),
    rating: v.number(),
    isActive: v.boolean(),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);

    const testimonialId = await ctx.db.insert("testimonials", {
      quote: args.quote,
      author: args.author,
      role: args.role,
      rating: args.rating,
      isActive: args.isActive,
      displayOrder: args.displayOrder,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: user.clerkId,
    });

    return testimonialId;
  },
});

/**
 * Update an existing testimonial (admin only)
 */
export const updateTestimonial = mutation({
  args: {
    id: v.id("testimonials"),
    quote: v.string(),
    author: v.string(),
    role: v.string(),
    rating: v.number(),
    isActive: v.boolean(),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { id, ...updates } = args;

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });

    return id;
  },
});

/**
 * Delete a testimonial (admin only)
 */
export const deleteTestimonial = mutation({
  args: {
    id: v.id("testimonials"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.db.delete(args.id);
  },
});

/**
 * Toggle testimonial active status (admin only)
 */
export const toggleTestimonialStatus = mutation({
  args: {
    id: v.id("testimonials"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    await ctx.db.patch(args.id, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    });

    return args.id;
  },
});
