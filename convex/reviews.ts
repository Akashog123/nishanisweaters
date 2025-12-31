import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, requireAdmin, getCurrentUser } from "./lib/auth";
import { ConvexError } from "convex/values";
import { createRateLimiter } from "./lib/rateLimit";

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

    // Batch fetch all users first to avoid N+1 query pattern
    // Instead of querying for each review's user individually (N queries),
    // we collect unique user IDs and fetch them all in parallel (1 batch query),
    // then use a Map for O(1) lookups when enriching reviews.
    const userIds = [...new Set(reviews.map((r) => r.userId))];
    const users = await Promise.all(
      userIds.map((id) =>
        ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", id))
          .first()
      )
    );
    const userMap = new Map(
      users.filter(Boolean).map((u) => [u!.clerkId, u!])
    );

    // Map reviews with cached user data (no additional queries)
    const reviewsWithUser = reviews.map((review) => {
      const user = userMap.get(review.userId);
      return {
        ...review,
        userName: user
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Anonymous"
          : "Anonymous",
      };
    });

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
      canReview: hasPurchased,
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

    // Check if user has purchased this product (required for submitting reviews)
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user_id", (q) => q.eq("userId", clerkId))
      .filter((q) => q.eq(q.field("orderStatus"), "delivered"))
      .collect();

    const purchaseOrder = orders.find((order) =>
      order.items.some((item) => item.productId === args.productId)
    );

    // Enforce: Only customers who have purchased can submit reviews
    if (!purchaseOrder) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only customers who have purchased this product can write a review",
      });
    }

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

// Create rate limiter for review voting (10 votes per minute per user)
const reviewVoteRateLimiter = createRateLimiter("mutation", {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
});

// Mutation: Mark review as helpful
export const markHelpful = mutation({
  args: {
    reviewId: v.id("reviews"),
  },
  handler: async (ctx, args) => {
    // Get user identity for rate limiting (works for both authenticated and anonymous users)
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject || "anonymous";

    // Apply rate limiting to prevent vote manipulation
    const rateLimitResult = await reviewVoteRateLimiter.consume(
      ctx,
      `review-vote:${userId}`,
      undefined // No IP address available in Convex
    );

    if (!rateLimitResult.allowed) {
      throw new ConvexError({
        code: "RATE_LIMIT_EXCEEDED",
        message: `Too many vote attempts. Please try again in ${Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)} seconds.`,
        resetAt: rateLimitResult.resetAt,
      });
    }

    // Verify review exists
    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Review not found",
      });
    }

    // Increment helpful count
    await ctx.db.patch(args.reviewId, {
      helpfulCount: review.helpfulCount + 1,
    });

    return {
      success: true,
      newCount: review.helpfulCount + 1,
      rateLimitRemaining: rateLimitResult.remaining,
    };
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

    // Batch fetch all products and users first to avoid N+1 query pattern
    // Instead of querying for each review's product and user individually (2N queries),
    // we collect unique IDs and fetch them all in parallel (2 batch queries),
    // then use Maps for O(1) lookups when enriching reviews.

    // Batch fetch products - dedupe product IDs and fetch in parallel
    const productIds = [...new Set(reviews.map((r) => r.productId))];
    const products = await Promise.all(
      productIds.map((id) => ctx.db.get(id))
    );
    const productMap = new Map(
      products.filter(Boolean).map((p) => [p!._id, p!])
    );

    // Batch fetch users - dedupe user IDs and fetch in parallel
    const userIds = [...new Set(reviews.map((r) => r.userId))];
    const users = await Promise.all(
      userIds.map((id) =>
        ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", id))
          .first()
      )
    );
    const userMap = new Map(
      users.filter(Boolean).map((u) => [u!.clerkId, u!])
    );

    // Enrich reviews with cached product and user data (no additional queries)
    const enrichedReviews = reviews.map((review) => {
      const product = productMap.get(review.productId);
      const user = userMap.get(review.userId);

      return {
        ...review,
        productName: product?.name || "Unknown Product",
        userName: user
          ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Anonymous"
          : "Anonymous",
        userEmail: user?.email || "",
      };
    });

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
