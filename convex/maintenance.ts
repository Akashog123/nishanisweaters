/**
 * Maintenance Tasks
 *
 * Internal mutations for scheduled maintenance and cleanup.
 *
 * OPTIMIZATION PATTERNS:
 * 1. Batch processing with size limits to prevent timeouts
 * 2. Parallel deletion where possible
 * 3. Index usage for efficient filtering
 * 4. Chunked operations to avoid memory pressure
 */

import { internalMutation, mutation } from "./_generated/server";
import { logger } from "./lib/logger";

// Constants for batch processing
const CLEANUP_BATCH_SIZE = 100;  // Max items per batch
const PARALLEL_DELETE_SIZE = 25; // Items to delete in parallel

/**
 * Helper function to delete items in parallel batches.
 * This is more efficient than sequential deletion.
 * Using any for the id type since we're abstracting over different table types.
 */
async function deleteInParallelBatches(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: { db: { delete: (id: any) => Promise<void> } },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ids: any[],
  batchSize: number = PARALLEL_DELETE_SIZE
): Promise<number> {
  let deletedCount = 0;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    await Promise.all(batch.map((id) => ctx.db.delete(id)));
    deletedCount += batch.length;
  }

  return deletedCount;
}

// Internal mutation: Cleanup old inventory logs
// Called by cron job daily at 3 AM UTC
// Removes logs older than 90 days to prevent database bloat
// OPTIMIZATION: Uses index and parallel batch deletion
export const cleanupOldInventoryLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    // Find old inventory logs using the timestamp index
    const oldLogs = await ctx.db
      .query("inventoryLogs")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), ninetyDaysAgo))
      .take(CLEANUP_BATCH_SIZE);

    // Delete in parallel batches for better performance
    const ids = oldLogs.map((log) => log._id);
    const deletedCount = await deleteInParallelBatches(ctx, ids);

    if (deletedCount > 0) {
      logger.info('[Maintenance] Deleted old inventory logs', { deletedCount, thresholdDays: 90 });
    }
    return { deletedCount };
  },
});

// Internal mutation: Cleanup old order status history
// Called on demand or by additional cron job if needed
// Removes history older than 1 year
// OPTIMIZATION: Uses parallel batch deletion
export const cleanupOldOrderHistory = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;

    // Find old order status history entries
    const oldHistory = await ctx.db
      .query("orderStatusHistory")
      .filter((q) => q.lt(q.field("timestamp"), oneYearAgo))
      .take(CLEANUP_BATCH_SIZE);

    // Delete in parallel batches
    const ids = oldHistory.map((entry) => entry._id);
    const deletedCount = await deleteInParallelBatches(ctx, ids);

    if (deletedCount > 0) {
      logger.info('[Maintenance] Deleted old order history entries', { deletedCount, thresholdDays: 365 });
    }
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

    logger.info('[Maintenance] Updated hasLowStock flag for products', { updatedCount });
    return { updatedCount };
  },
});

// Migration: Remove deprecated wholesalePriceTier1/2/3 fields from products
// Run this once after schema update to clean existing documents
// Usage: npx convex run maintenance:migrateRemoveWholesaleTiers
export const migrateRemoveWholesaleTiers = mutation({
  args: {},
  handler: async (ctx) => {
    let updatedCount = 0;
    const products = await ctx.db.query("products").collect();

    for (const product of products) {
      // Type assertion to access legacy fields that are no longer in schema
      const legacyProduct = product as typeof product & {
        wholesalePriceTier1?: number;
        wholesalePriceTier2?: number;
        wholesalePriceTier3?: number;
      };

      // Check if product has any of the deprecated fields
      if (
        legacyProduct.wholesalePriceTier1 !== undefined ||
        legacyProduct.wholesalePriceTier2 !== undefined ||
        legacyProduct.wholesalePriceTier3 !== undefined
      ) {
        // Use tier2 as the new flat wholesale price if not already set
        const wholesalePrice =
          legacyProduct.wholesalePrice ?? legacyProduct.wholesalePriceTier2;

        // Replace document with clean version (Convex doesn't support field deletion via patch)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { wholesalePriceTier1, wholesalePriceTier2, wholesalePriceTier3, ...cleanProduct } = legacyProduct;

        await ctx.db.replace(product._id, {
          ...cleanProduct,
          wholesalePrice,
        });
        updatedCount++;
      }
    }

    logger.info('[Migration] Removed wholesale tier fields from products', { updatedCount });
    return { updatedCount, message: `Migrated ${updatedCount} products` };
  },
});

// Migration: Remove deprecated wholesaleTier field from users
// Run this once after schema update to clean existing documents
// Usage: npx convex run maintenance:migrateRemoveUserWholesaleTier
export const migrateRemoveUserWholesaleTier = mutation({
  args: {},
  handler: async (ctx) => {
    let updatedCount = 0;
    const users = await ctx.db.query("users").collect();

    for (const user of users) {
      // Type assertion to access legacy field that is no longer in schema
      const legacyUser = user as typeof user & {
        wholesaleTier?: string;
      };

      if (legacyUser.wholesaleTier !== undefined) {
        // Replace document with clean version
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { wholesaleTier, ...cleanUser } = legacyUser;

        await ctx.db.replace(user._id, cleanUser);
        updatedCount++;
      }
    }

    logger.info('[Migration] Removed wholesaleTier field from users', { updatedCount });
    return { updatedCount, message: `Migrated ${updatedCount} users` };
  },
});

// Internal mutation: Cleanup expired rate limit records
// Called by cron job hourly to prevent database bloat
// OPTIMIZATION: Uses index and parallel batch deletion
export const cleanupExpiredRateLimits = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find expired rate limit records using the expiresAt index
    const expiredRecords = await ctx.db
      .query("rateLimits")
      .withIndex("by_expires_at")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .take(CLEANUP_BATCH_SIZE);

    // Delete in parallel batches
    const ids = expiredRecords.map((record) => record._id);
    const deletedCount = await deleteInParallelBatches(ctx, ids);

    if (deletedCount > 0) {
      logger.info('[Maintenance] Deleted expired rate limit records', { deletedCount });
    }
    return { deletedCount };
  },
});

// Internal mutation: Cleanup old security events
// Called by cron job daily to keep only 90 days of security events
// Critical events are kept for 1 year
// OPTIMIZATION: Uses indexes and parallel batch deletion
export const cleanupOldSecurityEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;

    // Find old security events (non-critical older than 90 days)
    const oldEvents = await ctx.db
      .query("securityEvents")
      .withIndex("by_timestamp")
      .filter((q) =>
        q.and(
          q.lt(q.field("timestamp"), ninetyDaysAgo),
          q.neq(q.field("severity"), "critical")
        )
      )
      .take(CLEANUP_BATCH_SIZE);

    // Find very old critical events (older than 1 year)
    const veryOldCritical = await ctx.db
      .query("securityEvents")
      .withIndex("by_severity_timestamp", (q) => q.eq("severity", "critical"))
      .filter((q) => q.lt(q.field("timestamp"), oneYearAgo))
      .take(CLEANUP_BATCH_SIZE);

    // Combine and delete all old events in parallel
    const allIds = [
      ...oldEvents.map((e) => e._id),
      ...veryOldCritical.map((e) => e._id),
    ];
    const deletedCount = await deleteInParallelBatches(ctx, allIds);

    if (deletedCount > 0) {
      logger.info('[Maintenance] Deleted old security events', {
        deletedCount,
        nonCriticalThresholdDays: 90,
        criticalThresholdDays: 365
      });
    }
    return { deletedCount };
  },
});

/**
 * Migration: Backfill denormalized filter fields for products
 *
 * PERFORMANCE OPTIMIZATION
 * ------------------------
 * This migration populates availableSizes, availableColors, and priceBucket
 * fields on existing products. These denormalized fields enable:
 *
 * 1. O(N) instead of O(N*M) complexity in getFilterOptions query
 * 2. Faster size/color filtering in listProducts without variant iteration
 * 3. Price bucket indexing for range queries
 *
 * Usage: npx convex run maintenance:migrateBackfillDenormalizedFields
 *
 * Safe to run multiple times - only updates products missing these fields.
 * Process in batches to avoid timeout on large catalogs.
 */
export const migrateBackfillDenormalizedFields = mutation({
  args: {},
  handler: async (ctx) => {
    let updatedCount = 0;
    let skippedCount = 0;

    // Process all products (in production, use pagination for >1000 products)
    const products = await ctx.db.query("products").collect();

    for (const product of products) {
      // Check if product already has denormalized fields populated
      const hasAllFields =
        product.availableSizes &&
        product.availableSizes.length > 0 &&
        product.availableColors &&
        product.availableColors.length > 0 &&
        product.priceBucket;

      if (hasAllFields) {
        skippedCount++;
        continue;
      }

      // Extract unique sizes and colors from variants
      const sizesSet = new Set<string>();
      const colorsSet = new Set<string>();

      for (const variant of product.variants) {
        sizesSet.add(variant.size);
        colorsSet.add(variant.color);
      }

      const availableSizes = Array.from(sizesSet).sort();
      const availableColors = Array.from(colorsSet).sort();

      // Calculate price bucket
      let priceBucket: string;
      if (product.retailPrice < 1000) {
        priceBucket = "0-1000";
      } else if (product.retailPrice < 2500) {
        priceBucket = "1000-2500";
      } else if (product.retailPrice < 5000) {
        priceBucket = "2500-5000";
      } else if (product.retailPrice < 10000) {
        priceBucket = "5000-10000";
      } else {
        priceBucket = "10000+";
      }

      // Update product with denormalized fields
      await ctx.db.patch(product._id, {
        availableSizes,
        availableColors,
        priceBucket,
      });

      updatedCount++;
    }

    logger.info('[Migration] Backfilled denormalized fields for products', {
      updatedCount,
      skippedCount,
      totalProcessed: products.length,
    });

    return {
      updatedCount,
      skippedCount,
      message: `Updated ${updatedCount} products, skipped ${skippedCount} (already populated)`,
    };
  },
});

/**
 * Migration: Verify denormalized fields consistency
 *
 * Use this to check if denormalized fields are in sync with variants.
 * Returns products with inconsistencies without modifying them.
 *
 * Usage: npx convex run maintenance:verifyDenormalizedFields
 */
export const verifyDenormalizedFields = mutation({
  args: {},
  handler: async (ctx) => {
    const inconsistencies: Array<{
      productId: string;
      name: string;
      issue: string;
    }> = [];

    const products = await ctx.db.query("products").collect();

    for (const product of products) {
      // Compute expected values from variants
      const expectedSizes = new Set<string>();
      const expectedColors = new Set<string>();

      for (const variant of product.variants) {
        expectedSizes.add(variant.size);
        expectedColors.add(variant.color);
      }

      // Check sizes
      const actualSizes = new Set(product.availableSizes || []);
      const sizesMatch =
        expectedSizes.size === actualSizes.size &&
        [...expectedSizes].every(s => actualSizes.has(s));

      if (!sizesMatch) {
        inconsistencies.push({
          productId: product._id,
          name: product.name,
          issue: `Sizes mismatch: expected [${[...expectedSizes].join(", ")}], got [${[...actualSizes].join(", ")}]`,
        });
      }

      // Check colors
      const actualColors = new Set(product.availableColors || []);
      const colorsMatch =
        expectedColors.size === actualColors.size &&
        [...expectedColors].every(c => actualColors.has(c));

      if (!colorsMatch) {
        inconsistencies.push({
          productId: product._id,
          name: product.name,
          issue: `Colors mismatch: expected [${[...expectedColors].join(", ")}], got [${[...actualColors].join(", ")}]`,
        });
      }

      // Check price bucket
      let expectedBucket: string;
      if (product.retailPrice < 1000) {
        expectedBucket = "0-1000";
      } else if (product.retailPrice < 2500) {
        expectedBucket = "1000-2500";
      } else if (product.retailPrice < 5000) {
        expectedBucket = "2500-5000";
      } else if (product.retailPrice < 10000) {
        expectedBucket = "5000-10000";
      } else {
        expectedBucket = "10000+";
      }

      if (product.priceBucket !== expectedBucket) {
        inconsistencies.push({
          productId: product._id,
          name: product.name,
          issue: `Price bucket mismatch: expected "${expectedBucket}", got "${product.priceBucket}"`,
        });
      }
    }

    logger.info('[Verification] Checked denormalized fields consistency', {
      totalProducts: products.length,
      inconsistencyCount: inconsistencies.length,
    });

    return {
      totalProducts: products.length,
      inconsistencyCount: inconsistencies.length,
      inconsistencies: inconsistencies.slice(0, 50), // Limit response size
      hasMore: inconsistencies.length > 50,
    };
  },
});
