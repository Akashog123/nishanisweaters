/**
 * Internal queries and mutations for webhook event idempotency tracking.
 *
 * These functions are used by the payment webhook handler to:
 * 1. Check if an event has already been processed (idempotency)
 * 2. Record processed events to prevent duplicate handling
 *
 * The x-razorpay-event-id header from Razorpay provides a unique identifier
 * for each webhook event, allowing us to safely handle retries.
 */

import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Check if a webhook event has already been processed.
 * Used for idempotency - prevents duplicate event processing.
 */
export const getByEventId = internalQuery({
  args: {
    eventId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webhookEvents")
      .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
      .first();
  },
});

/**
 * Record a processed webhook event.
 * Called after successfully processing an event to prevent re-processing.
 */
export const recordProcessedEvent = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    orderId: v.optional(v.id("orders")),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("webhookEvents", {
      eventId: args.eventId,
      eventType: args.eventType,
      processedAt: Date.now(),
      orderId: args.orderId,
      success: args.success,
      errorMessage: args.errorMessage,
    });
  },
});

/**
 * Clean up old webhook events (optional maintenance).
 * Events older than 30 days can be safely removed.
 */
export const cleanupOldEvents = internalMutation({
  args: {
    olderThanMs: v.number(), // Events older than this will be deleted
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.olderThanMs;
    const oldEvents = await ctx.db
      .query("webhookEvents")
      .withIndex("by_processed_at", (q) => q.lt("processedAt", cutoffTime))
      .take(100); // Process in batches

    for (const event of oldEvents) {
      await ctx.db.delete(event._id);
    }

    return { deleted: oldEvents.length };
  },
});
