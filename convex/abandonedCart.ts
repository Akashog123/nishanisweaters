import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAbandonedCartConfig } from "./lib/getSettings";
import { logger } from "./lib/logger";

// Query to find abandoned carts eligible for reminders
// OPTIMIZATION: Uses indexed query and batch processing to prevent performance spikes
export const findAbandonedCarts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get dynamic settings for abandoned cart timing
    const {
      reminderDelays,
      maxReminders,
      cartAgeThreshold,
    } = await getAbandonedCartConfig(ctx);

    const cutoffTime = now - cartAgeThreshold;

    // OPTIMIZATION: Query carts by lastModified using a filter
    // Limited to a batch size to prevent performance spikes
    const BATCH_SIZE = 100;

    // Find carts that:
    // 1. Have items (checked after fetch - no index on array length)
    // 2. Are older than threshold (filtered)
    // 3. Have a userId (registered users only)
    const carts = await ctx.db
      .query("cart")
      .filter((q) =>
        q.and(
          q.neq(q.field("userId"), undefined),
          q.lt(q.field("lastModified"), cutoffTime)
        )
      )
      .take(BATCH_SIZE);

    // Filter out empty carts in memory
    const abandonedCarts = carts.filter((cart) => cart.items.length > 0);

    // OPTIMIZATION: Batch fetch all notification records in parallel
    // instead of querying one by one in a loop
    const cartIds = abandonedCarts.map((cart) => cart._id);
    const notificationPromises = cartIds.map((cartId) =>
      ctx.db
        .query("abandonedCartNotifications")
        .withIndex("by_cart_id", (q) => q.eq("cartId", cartId))
        .first()
    );

    const notifications = await Promise.all(notificationPromises);

    // Create a map for O(1) notification lookup
    const notificationMap = new Map(
      cartIds.map((cartId, index) => [cartId, notifications[index]])
    );

    // Combine carts with their notification status
    const cartsWithNotificationStatus = abandonedCarts.map((cart) => ({
      cart,
      notification: notificationMap.get(cart._id) || null,
    }));

    // Filter to carts that need a reminder
    const cartsNeedingReminder = cartsWithNotificationStatus.filter(
      ({ cart, notification }) => {
        if (!notification) {
          // No notification yet - eligible for first reminder
          return true;
        }

        if (notification.convertedToOrder) {
          // Already converted - skip
          return false;
        }

        if (notification.reminderCount >= maxReminders) {
          // Max reminders sent - skip
          return false;
        }

        // Check if enough time has passed for next reminder
        const nextReminderIndex = notification.reminderCount; // 0-indexed for array
        const nextReminderDelay = reminderDelays[nextReminderIndex] ?? reminderDelays[reminderDelays.length - 1];
        const timeSinceCartModified = now - cart.lastModified;

        return timeSinceCartModified >= nextReminderDelay;
      }
    );

    return cartsNeedingReminder;
  },
});

// Process a single abandoned cart
export const processAbandonedCart = internalMutation({
  args: {
    cartId: v.id("cart"),
    userId: v.string(),
    reminderNumber: v.number(),
    items: v.array(
      v.object({
        name: v.string(),
        image: v.string(),
        price: v.number(),
        size: v.string(),
        color: v.string(),
      })
    ),
    cartTotal: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get dynamic settings for abandoned cart timing
    const { reminderDelays, maxReminders } = await getAbandonedCartConfig(ctx);

    // Get user details
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.userId))
      .first();

    if (!user || !user.email) {
      logger.info('Skipping abandoned cart processing: no user or email found', { userId: args.userId });
      return { success: false, reason: "No user email" };
    }

    // Check if notification already exists
    const notification = await ctx.db
      .query("abandonedCartNotifications")
      .withIndex("by_cart_id", (q) => q.eq("cartId", args.cartId))
      .first();

    if (notification && notification.convertedToOrder) {
      return { success: false, reason: "Already converted to order" };
    }

    // Calculate next reminder time
    const nextReminderNumber = args.reminderNumber + 1;
    const nextReminderIndex = nextReminderNumber - 1; // 0-indexed
    const nextReminderAt =
      nextReminderNumber <= maxReminders && reminderDelays[nextReminderIndex]
        ? now + reminderDelays[nextReminderIndex]
        : undefined;

    if (notification) {
      // Update existing notification
      await ctx.db.patch(notification._id, {
        reminderCount: args.reminderNumber,
        lastReminderAt: now,
        nextReminderAt,
      });
    } else {
      // Create new notification record
      await ctx.db.insert("abandonedCartNotifications", {
        cartId: args.cartId,
        userId: args.userId,
        email: user.email,
        reminderCount: args.reminderNumber,
        lastReminderAt: now,
        nextReminderAt,
        convertedToOrder: false,
        createdAt: now,
      });
    }

    // Log the email
    await ctx.db.insert("emailLogs", {
      emailType: "abandoned_cart",
      recipientEmail: user.email,
      recipientName: user.firstName || undefined,
      subject: `Abandoned Cart Reminder #${args.reminderNumber}`,
      cartId: args.cartId,
      userId: args.userId,
      status: "pending",
      createdAt: now,
    });

    // Schedule the email to be sent
    await ctx.scheduler.runAfter(0, internal.emails.sendAbandonedCartEmail, {
      to: user.email,
      customerName: user.firstName || "Valued Customer",
      reminderNumber: args.reminderNumber,
      items: args.items,
      cartTotal: args.cartTotal,
      cartUrl: "https://nishaniwoolera.com/cart",
    });

    return { success: true, reminderNumber: args.reminderNumber };
  },
});

// Mark cart as converted when order is placed
export const markCartConverted = internalMutation({
  args: {
    cartId: v.id("cart"),
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db
      .query("abandonedCartNotifications")
      .withIndex("by_cart_id", (q) => q.eq("cartId", args.cartId))
      .first();

    if (notification) {
      await ctx.db.patch(notification._id, {
        convertedToOrder: true,
        orderId: args.orderId,
      });
    }
  },
});

// Main processing function called by cron
export const processAbandonedCarts = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find all carts needing reminders
    const cartsNeedingReminder = await ctx.runQuery(
      internal.abandonedCart.findAbandonedCarts,
      {}
    );

    let processedCount = 0;
    let errorCount = 0;

    for (const { cart, notification } of cartsNeedingReminder) {
      if (!cart.userId) continue;

      const reminderNumber = notification ? notification.reminderCount + 1 : 1;

      // Calculate cart total
      const cartTotal = cart.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      // Format items for email
      const items = cart.items.map((item) => ({
        name: item.name,
        image: item.image,
        price: item.price,
        size: item.size,
        color: item.color,
      }));

      try {
        await ctx.runMutation(internal.abandonedCart.processAbandonedCart, {
          cartId: cart._id,
          userId: cart.userId,
          reminderNumber,
          items,
          cartTotal,
        });
        processedCount++;
      } catch (error) {
        logger.error('Error processing abandoned cart', error, { cartId: cart._id });
        errorCount++;
      }
    }

    return { processedCount, errorCount };
  },
});
