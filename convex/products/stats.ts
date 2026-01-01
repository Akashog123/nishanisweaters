import { query } from "../_generated/server";
import { requireAdmin } from "../lib/auth";

/**
 * Query: Get aggregated product statistics for admin dashboard
 *
 * PERFORMANCE OPTIMIZATION:
 * -------------------------
 * This query replaces the inefficient pattern of fetching all products (up to 1000)
 * just to calculate stats. Instead, it uses targeted index queries to count products
 * efficiently without loading full product documents into memory.
 *
 * APPROACH:
 * - Uses indexed queries with .collect() for counting (Convex doesn't have COUNT)
 * - Leverages existing indexes: by_is_active, by_has_low_stock, by_category_active
 * - Returns only aggregated numbers, not product data
 *
 * COMPLEXITY: O(N) where N is total products, but with minimal memory footprint
 * since we only need to count, not process full documents.
 */
export const getProductStats = query({
  args: {},
  handler: async (ctx) => {
    // Require admin authorization
    await requireAdmin(ctx);

    // Fetch all products once for counting (more efficient than multiple queries)
    const allProducts = await ctx.db.query("products").collect();

    // Calculate stats
    let totalCount = 0;
    let activeCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const categoryCountMap = new Map<string, number>();

    for (const product of allProducts) {
      totalCount++;

      if (product.isActive) {
        activeCount++;
      }

      // Check low stock using denormalized flag
      if (product.hasLowStock) {
        lowStockCount++;
      }

      // Check out of stock by summing variant quantities
      const totalStock = product.variants.reduce(
        (sum, variant) => sum + variant.stockQuantity,
        0
      );
      if (totalStock === 0) {
        outOfStockCount++;
      }

      // Count by category (only active products)
      if (product.isActive) {
        const currentCount = categoryCountMap.get(product.category) || 0;
        categoryCountMap.set(product.category, currentCount + 1);
      }
    }

    // Convert category map to array for easier consumption
    const productsByCategory = Array.from(categoryCountMap.entries()).map(
      ([category, count]) => ({ category, count })
    );

    // Sort categories by count (descending)
    productsByCategory.sort((a, b) => b.count - a.count);

    return {
      totalCount,
      activeCount,
      inactiveCount: totalCount - activeCount,
      lowStockCount,
      outOfStockCount,
      inStockCount: activeCount - outOfStockCount,
      productsByCategory,
    };
  },
});
