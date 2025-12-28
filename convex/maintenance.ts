/**
 * Maintenance Tasks
 *
 * Internal mutations for scheduled maintenance and cleanup.
 */

import { internalMutation } from "./_generated/server";

// Internal mutation: Cleanup old inventory logs
// Called by cron job daily at 3 AM UTC
// Removes logs older than 90 days to prevent database bloat
export const cleanupOldInventoryLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    // Find old inventory logs (process in batches)
    const oldLogs = await ctx.db
      .query("inventoryLogs")
      .filter((q) => q.lt(q.field("timestamp"), ninetyDaysAgo))
      .take(500); // Process in batches to avoid timeout

    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      deletedCount++;
    }

    console.log(`[Maintenance] Deleted ${deletedCount} inventory logs older than 90 days`);
    return { deletedCount };
  },
});

// Internal mutation: Cleanup old order status history
// Called on demand or by additional cron job if needed
// Removes history older than 1 year
export const cleanupOldOrderHistory = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    // Find old order status history entries (process in batches)
    const oldHistory = await ctx.db
      .query("orderStatusHistory")
      .filter((q) => q.lt(q.field("timestamp"), oneYearAgo))
      .take(500);

    for (const entry of oldHistory) {
      await ctx.db.delete(entry._id);
      deletedCount++;
    }

    console.log(`[Maintenance] Deleted ${deletedCount} order history entries older than 1 year`);
    return { deletedCount };
  },
});

// Internal mutation: Recalculate hasLowStock flags for all products
// Use when lowStockThreshold values have changed or for data consistency
export const recalculateLowStockFlags = internalMutation({
  args: {},
  handler: async (ctx) => {
    let updatedCount = 0;

    // Process products in batches
    const products = await ctx.db.query("products").take(100);

    for (const product of products) {
      const hasLowStock = product.variants.some(
        (v) => v.stockQuantity <= v.lowStockThreshold
      );

      if (product.hasLowStock !== hasLowStock) {
        await ctx.db.patch(product._id, { hasLowStock });
        updatedCount++;
      }
    }

    console.log(`[Maintenance] Updated hasLowStock flag for ${updatedCount} products`);
    return { updatedCount };
  },
});
