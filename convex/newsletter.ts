import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Mutation: Subscribe to newsletter
export const subscribeToNewsletter = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if already subscribed
    const existing = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      if (existing.isSubscribed) {
        return { success: true, message: "Already subscribed" };
      }
      // Resubscribe
      await ctx.db.patch(existing._id, {
        isSubscribed: true,
        subscribedAt: now,
        unsubscribedAt: undefined,
        updatedAt: now,
      });
      return { success: true, message: "Resubscribed successfully" };
    }

    // Create new subscriber
    await ctx.db.insert("newsletterSubscribers", {
      email: args.email,
      isSubscribed: true,
      subscribedAt: now,
      tags: args.tags || ["general"],
      source: args.source || "website",
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, message: "Subscribed successfully" };
  },
});

// Mutation: Unsubscribe from newsletter
export const unsubscribeFromNewsletter = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const subscriber = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!subscriber) {
      return { success: false, message: "Email not found" };
    }

    await ctx.db.patch(subscriber._id, {
      isSubscribed: false,
      unsubscribedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, message: "Unsubscribed successfully" };
  },
});
