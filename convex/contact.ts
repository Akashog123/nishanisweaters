/**
 * Contact Form API - Public contact form submissions and admin management
 *
 * This module provides:
 * - Public mutation for submitting contact form (with rate limiting)
 * - Admin queries for listing and filtering contact submissions
 * - Admin mutation for updating submission status
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdmin, getCurrentUser } from "./lib/auth";
import {
  validateEmail,
  validateOptionalPhone,
  validateRequiredString,
  sanitizeText,
} from "./lib/validation";
import { createRateLimiter } from "./lib/rateLimit";

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================

/**
 * Contact form rate limiter: 5 submissions per email per hour
 * Uses the existing rate limiting infrastructure
 */
const contactRateLimiter = createRateLimiter("mutation", {
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
});

// ============================================
// SUBJECT LABELS (for UI display)
// ============================================

export const SUBJECT_LABELS = {
  general: "General Inquiry",
  order_inquiry: "Order Inquiry",
  wholesale: "Wholesale Inquiry",
  feedback: "Feedback",
  other: "Other",
} as const;

export type ContactSubject = keyof typeof SUBJECT_LABELS;

// ============================================
// PUBLIC MUTATIONS
// ============================================

/**
 * Submit a contact form
 *
 * Features:
 * - Validates all inputs server-side
 * - Rate limits to 5 submissions per email per hour
 * - Captures logged-in user ID if available
 * - Schedules email notification to admin
 *
 * @public
 */
export const submitContactForm = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    subject: v.union(
      v.literal("general"),
      v.literal("order_inquiry"),
      v.literal("wholesale"),
      v.literal("feedback"),
      v.literal("other")
    ),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // ========================================
    // INPUT VALIDATION
    // ========================================

    // Validate and sanitize name
    const name = validateRequiredString(args.name, "Name", 2);
    if (name.length > 100) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Name must be 100 characters or less",
        field: "name",
      });
    }

    // Validate email
    const email = validateEmail(args.email);

    // Validate optional phone
    const phone = validateOptionalPhone(args.phone);

    // Validate and sanitize message
    const message = sanitizeText(args.message, 2000);
    if (message.length < 10) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Message must be at least 10 characters",
        field: "message",
      });
    }

    // ========================================
    // RATE LIMITING
    // ========================================

    const rateLimitResult = await contactRateLimiter.consume(
      ctx,
      `contact:${email}`
    );

    if (!rateLimitResult.allowed) {
      throw new ConvexError({
        code: "RATE_LIMIT_EXCEEDED",
        message:
          "You have submitted too many contact requests. Please try again later.",
        resetAt: rateLimitResult.resetAt,
      });
    }

    // ========================================
    // GET CURRENT USER (if logged in)
    // ========================================

    const user = await getCurrentUser(ctx);
    const userId = user?.clerkId;

    // ========================================
    // CREATE SUBMISSION
    // ========================================

    const submissionId = await ctx.db.insert("contactSubmissions", {
      name,
      email,
      phone,
      subject: args.subject,
      message,
      status: "pending",
      userId,
      createdAt: now,
      updatedAt: now,
    });

    // ========================================
    // SCHEDULE ADMIN NOTIFICATION EMAIL
    // ========================================

    // Schedule email notification to admin immediately
    await ctx.scheduler.runAfter(0, internal.emails.sendContactInquiryEmail, {
      submissionId,
      name,
      email,
      phone,
      subject: args.subject,
      message,
      userId,
      createdAt: now,
    });

    return {
      success: true,
      message:
        "Thank you for contacting us! We will get back to you as soon as possible.",
      submissionId,
    };
  },
});

// ============================================
// ADMIN QUERIES
// ============================================

/**
 * Get contact submissions with filtering and pagination (Admin only)
 *
 * Features:
 * - Filter by status
 * - Paginated results
 * - Ordered by createdAt desc (newest first)
 *
 * @admin
 */
export const getContactSubmissions = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("reviewed"),
        v.literal("resolved")
      )
    ),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    const limit = Math.min(args.limit || 20, 100);

    // Build query based on status filter
    let queryBuilder;

    if (args.status) {
      // Use compound index for status + created_at ordering
      queryBuilder = ctx.db
        .query("contactSubmissions")
        .withIndex("by_status_created", (q) => q.eq("status", args.status!))
        .order("desc");
    } else {
      // Use created_at index for all submissions
      queryBuilder = ctx.db
        .query("contactSubmissions")
        .withIndex("by_created_at")
        .order("desc");
    }

    // Apply pagination
    const paginatedResults = await queryBuilder.paginate({
      numItems: limit,
      cursor: args.cursor ?? null,
    });

    // Get counts for each status (for dashboard stats)
    const pendingCount = await ctx.db
      .query("contactSubmissions")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect()
      .then((r) => r.length);

    const reviewedCount = await ctx.db
      .query("contactSubmissions")
      .withIndex("by_status", (q) => q.eq("status", "reviewed"))
      .collect()
      .then((r) => r.length);

    const resolvedCount = await ctx.db
      .query("contactSubmissions")
      .withIndex("by_status", (q) => q.eq("status", "resolved"))
      .collect()
      .then((r) => r.length);

    return {
      submissions: paginatedResults.page,
      continueCursor: paginatedResults.continueCursor,
      isDone: paginatedResults.isDone,
      stats: {
        pending: pendingCount,
        reviewed: reviewedCount,
        resolved: resolvedCount,
        total: pendingCount + reviewedCount + resolvedCount,
      },
    };
  },
});

/**
 * Get a single contact submission by ID (Admin only)
 *
 * @admin
 */
export const getContactSubmission = query({
  args: {
    submissionId: v.id("contactSubmissions"),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    const submission = await ctx.db.get(args.submissionId);

    if (!submission) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Contact submission not found",
      });
    }

    return submission;
  },
});

// ============================================
// ADMIN MUTATIONS
// ============================================

/**
 * Update contact submission status (Admin only)
 *
 * Features:
 * - Update status to reviewed or resolved
 * - Add review notes
 * - Records who reviewed it
 * - Sets resolvedAt timestamp when resolved
 *
 * @admin
 */
export const updateContactStatus = mutation({
  args: {
    submissionId: v.id("contactSubmissions"),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("resolved")
    ),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Require admin authorization
    const admin = await requireAdmin(ctx);

    // Get submission
    const submission = await ctx.db.get(args.submissionId);

    if (!submission) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Contact submission not found",
      });
    }

    // Sanitize review notes if provided
    const reviewNotes = args.reviewNotes
      ? sanitizeText(args.reviewNotes, 1000)
      : undefined;

    // Build update object
    const updateData: {
      status: "pending" | "reviewed" | "resolved";
      updatedAt: number;
      reviewedBy?: string;
      reviewNotes?: string;
      resolvedAt?: number;
    } = {
      status: args.status,
      updatedAt: now,
    };

    // Set reviewedBy if not already set
    if (!submission.reviewedBy) {
      updateData.reviewedBy = admin.clerkId;
    }

    // Add review notes if provided
    if (reviewNotes !== undefined) {
      updateData.reviewNotes = reviewNotes;
    }

    // Set resolvedAt if status is resolved
    if (args.status === "resolved" && !submission.resolvedAt) {
      updateData.resolvedAt = now;
    }

    await ctx.db.patch(args.submissionId, updateData);

    return {
      success: true,
      message: `Contact submission status updated to ${args.status}`,
    };
  },
});

/**
 * Delete a contact submission (Admin only)
 *
 * Use with caution - this permanently deletes the submission
 *
 * @admin
 */
export const deleteContactSubmission = mutation({
  args: {
    submissionId: v.id("contactSubmissions"),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    // Get submission to verify it exists
    const submission = await ctx.db.get(args.submissionId);

    if (!submission) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Contact submission not found",
      });
    }

    await ctx.db.delete(args.submissionId);

    return {
      success: true,
      message: "Contact submission deleted",
    };
  },
});
