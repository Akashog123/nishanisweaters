import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin, requireOwnershipOrAdmin } from "./lib/auth";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import {
  validateEmail,
  validatePostalCode,
  validateRequiredString,
  validateOptionalGST,
} from "./lib/validation";

// ============================================
// WHOLESALE APPLICATIONS
// ============================================

// Mutation: Submit wholesale application
// SECURITY: Uses server-side identity verification
export const submitWholesaleApplication = mutation({
  args: {
    companyName: v.string(),
    businessEmail: v.optional(v.string()),
    gstNumber: v.optional(v.string()),
    businessAddress: v.object({
      street: v.string(),
      city: v.string(),
      state: v.string(),
      postalCode: v.string(),
      country: v.string(),
    }),
    website: v.optional(v.string()),
    documents: v.optional(v.array(v.object({
      type: v.union(
        v.literal("reseller_certificate"),
        v.literal("business_license"),
        v.literal("gst_certificate"),
        v.literal("other")
      ),
      url: v.string(),
      storageId: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    // Get authenticated user's clerkId from server-side identity (SECURE)
    const { clerkId } = await requireAuth(ctx);

    // Server-side validation using shared utilities
    const companyName = validateRequiredString(args.companyName, "Company name", 2);
    const cleanPostalCode = validatePostalCode(args.businessAddress.postalCode);
    const street = validateRequiredString(args.businessAddress.street, "Street address", 5);
    const city = validateRequiredString(args.businessAddress.city, "City");
    const state = validateRequiredString(args.businessAddress.state, "State");
    const country = validateRequiredString(args.businessAddress.country, "Country");

    // Validate optional fields
    let businessEmail: string | undefined;
    if (args.businessEmail && args.businessEmail.trim()) {
      businessEmail = validateEmail(args.businessEmail, "business email");
    }

    const gstNumber = validateOptionalGST(args.gstNumber);

    // Check if user already has an application
    const existingApplication = await ctx.db
      .query("wholesaleApplications")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existingApplication && existingApplication.status !== "rejected") {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "You already have a pending or approved application",
      });
    }

    const now = Date.now();

    // Create application
    const applicationId = await ctx.db.insert("wholesaleApplications", {
      clerkId,
      companyName,
      businessEmail,
      gstNumber,
      businessAddress: {
        street,
        city,
        state,
        postalCode: cleanPostalCode,
        country,
      },
      website: args.website?.trim(),
      documents: args.documents?.map(doc => ({
        ...doc,
        uploadedAt: now,
      })),
      status: "pending",
      submittedAt: now,
      updatedAt: now,
    });

    // Update user's wholesale status
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        wholesaleStatus: "pending",
        companyName,
        businessEmail,
        gstNumber,
        businessAddress: args.businessAddress,
        website: args.website?.trim(),
      });
    }

    return applicationId;
  },
});

// Query: Get user's wholesale application
// SECURITY: Uses server-side identity to get only the current user's application
export const getUserApplication = query({
  args: {},
  handler: async (ctx) => {
    // Get authenticated user's clerkId from server-side identity (SECURE)
    const { clerkId } = await requireAuth(ctx);

    return await ctx.db
      .query("wholesaleApplications")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();
  },
});

// Query: List all applications (Admin only)
// PERFORMANCE: Uses indexed queries with pagination instead of full table scan
export const listApplications = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("under_review")
    )),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    const limit = args.limit || 50;
    let query;

    // Use status index if filtering by status
    if (args.status) {
      query = ctx.db
        .query("wholesaleApplications")
        .withIndex("by_status", (q) => q.eq("status", args.status as "pending" | "approved" | "rejected" | "under_review"));
    } else {
      query = ctx.db.query("wholesaleApplications");
    }

    // Apply pagination
    const paginatedResults = await query
      .order("desc")
      .paginate({
        numItems: limit,
        cursor: args.cursor ?? null,
      });

    return {
      applications: paginatedResults.page,
      continueCursor: paginatedResults.continueCursor,
      isDone: paginatedResults.isDone,
    };
  },
});

// Mutation: Review application (Admin only)
export const reviewApplication = mutation({
  args: {
    applicationId: v.id("wholesaleApplications"),
    status: v.union(v.literal("approved"), v.literal("rejected"), v.literal("under_review")),
    reviewNotes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    const admin = await requireAdmin(ctx);

    const application = await ctx.db.get(args.applicationId);
    if (!application) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Application not found",
      });
    }

    // Validate: can't reject without reason
    if (args.status === "rejected" && !args.rejectionReason) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Rejection reason is required when rejecting an application",
      });
    }

    const now = Date.now();

    // Update application
    await ctx.db.patch(args.applicationId, {
      status: args.status,
      reviewedBy: admin.clerkId,
      reviewedAt: now,
      reviewNotes: args.reviewNotes,
      rejectionReason: args.rejectionReason,
      updatedAt: now,
    });

    // Update user based on decision
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", application.clerkId))
      .first();

    if (user) {
      if (args.status === "approved") {
        await ctx.db.patch(user._id, {
          role: "wholesale",
          wholesaleStatus: "approved",
        });

        // Send approval email
        await ctx.scheduler.runAfter(0, internal.emails.sendWholesaleStatusEmail, {
          to: user.email,
          customerName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || application.companyName,
          status: "approved",
        });
      } else if (args.status === "rejected") {
        await ctx.db.patch(user._id, {
          wholesaleStatus: "rejected",
        });

        // Send rejection email
        await ctx.scheduler.runAfter(0, internal.emails.sendWholesaleStatusEmail, {
          to: user.email,
          customerName: `${user.firstName || ""} ${user.lastName || ""}`.trim() || application.companyName,
          status: "rejected",
          rejectionReason: args.rejectionReason,
        });
      } else if (args.status === "under_review") {
        await ctx.db.patch(user._id, {
          wholesaleStatus: "pending",
        });
      }
    }
  },
});

// Query: Get application by ID
// SECURITY: Requires ownership (user can view their own application) OR admin
export const getApplication = query({
  args: { applicationId: v.id("wholesaleApplications") },
  handler: async (ctx, args) => {
    const application = await ctx.db.get(args.applicationId);

    if (!application) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Application not found",
      });
    }

    // SECURITY: Verify ownership or admin access
    await requireOwnershipOrAdmin(ctx, application.clerkId);

    return application;
  },
});
