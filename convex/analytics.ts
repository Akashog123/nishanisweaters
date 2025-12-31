import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/auth";

// Query: Get sales analytics (Admin only)
// Optimized: Uses compound index for paid orders and role index for customer count
export const getSalesAnalytics = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    // Use compound index by_payment_created for efficient filtering
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_payment_created", (q) =>
        q.eq("paymentStatus", "paid").gte("createdAt", args.startDate)
      )
      .filter((q) => q.lte(q.field("createdAt"), args.endDate))
      .collect();

    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const orderCount = orders.length;
    const averageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    // Group by date
    const dailyStats = orders.reduce((acc, order) => {
      const date = new Date(order.createdAt).toISOString().split("T")[0];
      if (!acc[date]) {
        acc[date] = { revenue: 0, orders: 0 };
      }
      acc[date].revenue += order.total;
      acc[date].orders += 1;
      return acc;
    }, {} as Record<string, { revenue: number; orders: number }>);

    // Get customer count using role index
    const customers = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "customer"))
      .collect();

    return {
      totalRevenue,
      orderCount,
      averageOrderValue,
      customerCount: customers.length,
      dailyStats,
    };
  },
});

// Query: Get top selling products (Admin only)
export const getTopSellingProducts = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    const orders = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), args.startDate),
          q.lte(q.field("createdAt"), args.endDate),
          q.eq(q.field("paymentStatus"), "paid")
        )
      )
      .collect();

    // Aggregate sales by product
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};

    for (const order of orders) {
      for (const item of order.items) {
        const productId = item.productId;
        if (!productSales[productId]) {
          productSales[productId] = {
            name: item.name,
            quantity: 0,
            revenue: 0,
          };
        }
        productSales[productId].quantity += item.quantity;
        productSales[productId].revenue += item.subtotal;
      }
    }

    // Sort by quantity and return top products
    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1].quantity - a[1].quantity)
      .slice(0, args.limit || 10)
      .map(([productId, data]) => ({
        productId,
        ...data,
      }));

    return topProducts;
  },
});

// Query: Get order type breakdown (Admin only)
export const getOrderTypeBreakdown = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    // Require admin authorization
    await requireAdmin(ctx);

    const orders = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), args.startDate),
          q.lte(q.field("createdAt"), args.endDate)
        )
      )
      .collect();

    const retail = orders.filter(o => o.orderType === "retail");
    const wholesale = orders.filter(o => o.orderType === "wholesale");

    return {
      retail: {
        count: retail.length,
        revenue: retail.reduce((sum, o) => sum + o.total, 0),
      },
      wholesale: {
        count: wholesale.length,
        revenue: wholesale.reduce((sum, o) => sum + o.total, 0),
      },
    };
  },
});

// Query: Get dashboard overview (Admin only)
// Optimized: Uses indexes instead of full table scans and parallel queries
export const getDashboardOverview = query({
  handler: async (ctx) => {
    // Require admin authorization
    await requireAdmin(ctx);

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Run independent queries in parallel for better performance
    const [
      recentOrders,
      pendingOrdersList,
      lowStockProducts,
      pendingApplicationsList,
      paidOrdersLast30Days,
      disputedOrdersList,
    ] = await Promise.all([
      // Recent orders - uses created_at index, limited to 5
      ctx.db
        .query("orders")
        .withIndex("by_created_at")
        .order("desc")
        .take(5),

      // Pending orders - use index for status filtering
      ctx.db
        .query("orders")
        .withIndex("by_order_status", (q) => q.eq("orderStatus", "pending"))
        .collect(),

      // Low stock products - use the hasLowStock index
      ctx.db
        .query("products")
        .withIndex("by_has_low_stock", (q) => q.eq("hasLowStock", true))
        .collect(),

      // Pending wholesale applications - use index
      ctx.db
        .query("wholesaleApplications")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .collect(),

      // Paid orders in last 30 days - use compound index
      ctx.db
        .query("orders")
        .withIndex("by_payment_created", (q) =>
          q.eq("paymentStatus", "paid").gte("createdAt", thirtyDaysAgo)
        )
        .collect(),

      // Disputed orders - filter by payment status (no index, but disputes are rare)
      ctx.db
        .query("orders")
        .filter((q) => q.eq(q.field("paymentStatus"), "disputed"))
        .collect(),
    ]);

    // Calculate metrics from the indexed query results
    const totalRevenue = paidOrdersLast30Days.reduce((sum, o) => sum + o.total, 0);

    return {
      recentOrders,
      pendingOrders: pendingOrdersList.length,
      lowStockCount: lowStockProducts.length,
      pendingApplications: pendingApplicationsList.length,
      totalRevenue,
      totalOrders: paidOrdersLast30Days.length,
      disputedOrders: disputedOrdersList.length,
    };
  },
});
