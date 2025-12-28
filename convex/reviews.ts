import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin, getCurrentUser } from "./lib/auth";
import { ConvexError } from "convex/values";

// Query: Get reviews for a product (only approved reviews for public)
export const getProductReviews = query({
  args: {
    productId: v.id("products"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("status"), "approved"))
      .order("desc")
      .take(limit);

    // Get user info for each review (just name, no email)
    const reviewsWithUser = await Promise.all(
      reviews.map(async (review) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", review.userId))
          .first();

        return {
          ...review,
          userName: user?.name || "Anonymous",
        };
      })
    );

    return reviewsWithUser;
  },
});

// Query: Get review statistics for a product
export const getProductReviewStats = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_product_id", (q) => q.eq("productId", args.productId))
      .filter((q) => q.eq(q.field("status"), "approved"))
      .collect();

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
    const averageRating = totalRating / reviews.length;

    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const review of reviews) {
      const rating = Math.round(review.rating) as 1 | 2 | 3 | 4 | 5;
      if (rating >= 1 && rating <= 5) {
        ratingDistribution[rating]++;
      }
    }

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length,
      ratingDistribution,
    };
  },
});

// Query: Check if user can review a product (has purchased and not already reviewed)
export const canUserReview = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) {
      return { canReview: false, reason: "not_logged_in" };
    }

    // Check if user already reviewed this product
    const existingReview = await ctx.db
      .query("reviews")
      .withIndex("by_user_id", (q) => q.eq("userId", currentUser.clerkId))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first();

    if (existingReview) {
      return { canReview: false, reason: "already_reviewed", reviewId: existingReview._id };
    }

    // Check if user has purchased this product
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user_id", (q) => q.eq("userId", currentUser.clerkId))
      .filter((q) => q.eq(q.field("orderStatus"), "delivered"))
      .collect();

    const hasPurchased = orders.some((order) =>
      order.items.some((item) => item.productId === args.productId)
    );

    return {
      canReview: true,
      isVerifiedPurchase: hasPurchased,
      reason: hasPurchased ? "verified_purchase" : "not_purchased",
    };
  },
});

// Mutation: Submit a review
export const submitReview = mutation({
  args: {
    productId: v.id("products"),
    rating: v.number(),
    title: v.optional(v.string()),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const { clerkId } = await requireAuth(ctx);

    // Validate rating
    if (args.rating < 1 || args.rating > 5) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Rating must be between 1 and 5",
      });
    }

    // Validate comment
    if (args.comment.trim().length < 10) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "Review comment must be at least 10 characters",
      });
    }

    // Check if product exists
    const product = await ctx.db.get(args.productId);
    if (!product) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Product not found",
      });
    }

    // Check if user already reviewed this product
    const existingReview = await ctx.db
      .query("reviews")
      .withIndex("by_user_id", (q) => q.eq("userId", clerkId))
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .first();

    if (existingReview) {
      throw new ConvexError({
        code: "VALIDATION_ERROR",
        message: "You have already reviewed this product",
      });
    }

    // Check if user has purchased this product (for verified purchase badge)
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user_id", (q) => q.eq("userId", clerkId))
      .filter((q) => q.eq(q.field("orderStatus"), "delivered"))
      .collect();

    const purchaseOrder = orders.find((order) =>
      order.items.some((item) => item.productId === args.productId)
    );

    const now = Date.now();

    // Create review
    const reviewId = await ctx.db.insert("reviews", {
      productId: args.productId,
      userId: clerkId,
      orderId: purchaseOrder?._id,
      rating: args.rating,
      title: args.title?.trim(),
      comment: args.comment.trim(),
      isVerifiedPurchase: !!purchaseOrder,
      isVerifiedByAdmin: false,
      helpfulCount: 0,
      status: "pending", // Requires admin approval
      createdAt: now,
      updatedAt: now,
    });

    return reviewId;
  },
});

// Mutation: Mark review as helpful
export const markHelpful = mutation({
  args: {
    reviewId: v.id("reviews"),
  },
  handler: async (ctx, args) => {
    // Just increment helpful count (no tracking of who marked it)
    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Review not found",
      });
    }

    await ctx.db.patch(args.reviewId, {
      helpfulCount: review.helpfulCount + 1,
    });
  },
});

// Admin: List all reviews
export const listAllReviews = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected")
    )),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = args.limit || 50;

    let query;
    if (args.status) {
      query = ctx.db
        .query("reviews")
        .withIndex("by_status", (q) => q.eq("status", args.status!));
    } else {
      query = ctx.db.query("reviews");
    }

    const reviews = await query.order("desc").take(limit);

    // Enrich with product and user info
    const enrichedReviews = await Promise.all(
      reviews.map(async (review) => {
        const [product, user] = await Promise.all([
          ctx.db.get(review.productId),
          ctx.db
            .query("users")
            .withIndex("by_clerk_id", (q) => q.eq("clerkId", review.userId))
            .first(),
        ]);

        return {
          ...review,
          productName: product?.name || "Unknown Product",
          userName: user?.name || "Anonymous",
          userEmail: user?.email || "",
        };
      })
    );

    return enrichedReviews;
  },
});

// Admin: Approve or reject review
export const moderateReview = mutation({
  args: {
    reviewId: v.id("reviews"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Review not found",
      });
    }

    await ctx.db.patch(args.reviewId, {
      status: args.status,
      isVerifiedByAdmin: args.status === "approved",
      updatedAt: Date.now(),
    });

    // Update product's average rating if approved
    if (args.status === "approved") {
      const product = await ctx.db.get(review.productId);
      if (product) {
        // Get all approved reviews for this product
        const approvedReviews = await ctx.db
          .query("reviews")
          .withIndex("by_product_id", (q) => q.eq("productId", review.productId))
          .filter((q) => q.eq(q.field("status"), "approved"))
          .collect();

        // Include the current review being approved
        const allRatings = [...approvedReviews.map(r => r.rating), review.rating];
        const averageRating = allRatings.reduce((sum, r) => sum + r, 0) / allRatings.length;

        await ctx.db.patch(review.productId, {
          averageRating: Math.round(averageRating * 10) / 10,
          reviewCount: allRatings.length,
        });
      }
    }
  },
});
