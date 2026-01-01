import { useMemo, useCallback, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { RevenueChartDataPoint } from "./RevenueChart";
import type { OrderTypeDataPoint } from "./OrderTypeChart";

/**
 * useDashboardData - Custom hook for managing dashboard data and state
 *
 * SOLID Principle: Single Responsibility
 * - Encapsulates all dashboard data fetching logic
 * - Memoizes computed data to prevent unnecessary recalculations
 * - Provides a clean API for the dashboard component
 *
 * This hook extracts 50+ lines of data fetching and memoization
 * logic from AdminDashboard, making the component purely presentational.
 */

export interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  lowStockCount: number;
  disputedOrders: number;
  customerCount: number;
  recentOrders: Array<{
    _id: string;
    orderNumber: string;
    userEmail: string;
    orderStatus: string;
    total: number;
    createdAt: number;
  }>;
}

export interface UseDashboardDataReturn {
  /** Core dashboard metrics */
  metrics: DashboardMetrics | null;
  /** Whether dashboard data is loading */
  isLoading: boolean;
  /** Processed chart data for revenue trend */
  chartData: RevenueChartDataPoint[];
  /** Processed data for order type breakdown */
  orderTypeData: OrderTypeDataPoint[];
  /** Low stock products for alert section */
  lowStockProducts: Array<{
    _id: string;
    name: string;
    variants: Array<{
      sku: string;
      stockQuantity: number;
      lowStockThreshold: number;
    }>;
  }>;
  /** Refresh state and handler */
  isRefreshing: boolean;
  handleRefresh: () => void;
  /** Date range for analytics */
  dateRange: {
    thirtyDaysAgo: number;
    endDate: number;
  };
}

export function useDashboardData(): UseDashboardDataReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Memoize date range to prevent query key changes on every render
  const dateRange = useMemo(() => {
    const now = Date.now();
    return {
      thirtyDaysAgo: now - 30 * 24 * 60 * 60 * 1000,
      endDate: now,
    };
  }, []); // Only calculate once on mount

  // Fetch dashboard overview data
  const dashboardData = useQuery(api.analytics.getDashboardOverview);

  // Fetch low stock products
  const lowStockResult = useQuery(api.products.getLowStockProducts, { limit: 10 });

  // Fetch analytics for charts
  const salesAnalytics = useQuery(api.analytics.getSalesAnalytics, {
    startDate: dateRange.thirtyDaysAgo,
    endDate: dateRange.endDate,
  });

  const orderTypeBreakdown = useQuery(api.analytics.getOrderTypeBreakdown, {
    startDate: dateRange.thirtyDaysAgo,
    endDate: dateRange.endDate,
  });

  // Memoize chart data transformation
  const chartData = useMemo((): RevenueChartDataPoint[] => {
    if (!salesAnalytics?.dailyStats) return [];

    return Object.entries(salesAnalytics.dailyStats)
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
        }),
        revenue: data.revenue,
        orders: data.orders,
      }))
      .slice(-14); // Last 14 days
  }, [salesAnalytics?.dailyStats]);

  // Memoize order type data transformation
  const orderTypeData = useMemo((): OrderTypeDataPoint[] => {
    if (!orderTypeBreakdown) return [];

    return [
      {
        name: "Retail",
        value: orderTypeBreakdown.retail.revenue,
        count: orderTypeBreakdown.retail.count,
      },
      {
        name: "Wholesale",
        value: orderTypeBreakdown.wholesale.revenue,
        count: orderTypeBreakdown.wholesale.count,
      },
    ];
  }, [orderTypeBreakdown]);

  // Memoize refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Simulate refresh delay - in production, this would trigger query invalidation
    setTimeout(() => setIsRefreshing(false), 1000);
  }, []);

  // Build metrics object
  const metrics: DashboardMetrics | null = dashboardData
    ? {
        totalRevenue: dashboardData.totalRevenue,
        totalOrders: dashboardData.totalOrders,
        pendingOrders: dashboardData.pendingOrders,
        lowStockCount: dashboardData.lowStockCount,
        disputedOrders: dashboardData.disputedOrders,
        customerCount: salesAnalytics?.customerCount || 0,
        recentOrders: dashboardData.recentOrders,
      }
    : null;

  return {
    metrics,
    isLoading: !dashboardData,
    chartData,
    orderTypeData,
    lowStockProducts: lowStockResult?.products || [],
    isRefreshing,
    handleRefresh,
    dateRange,
  };
}

export default useDashboardData;
