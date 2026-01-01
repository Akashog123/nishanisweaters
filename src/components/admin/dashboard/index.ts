/**
 * Admin Dashboard Components - Barrel Export
 *
 * This module exports all dashboard-related components and hooks
 * for clean imports throughout the application.
 *
 * Usage:
 * import { MetricCard, RevenueChart, useDashboardData } from "@/components/admin/dashboard";
 *
 * For lazy-loaded charts (recommended for performance):
 * import { LazyRevenueChart, ChartSkeleton } from "@/components/admin/dashboard";
 */

// Components
export { MetricCard } from "./MetricCard";
export type { MetricCardProps } from "./MetricCard";

export { RevenueChart } from "./RevenueChart";
export type { RevenueChartProps, RevenueChartDataPoint } from "./RevenueChart";

export { OrderTypeChart } from "./OrderTypeChart";
export type { OrderTypeChartProps, OrderTypeDataPoint } from "./OrderTypeChart";

export { OrderStatusBadge, PaymentStatusBadge, DisputeStatusBadge } from "./StatusBadges";

// Lazy-loaded chart components (recommended for initial load performance)
export {
  LazyRevenueChart,
  LazyOrderTypeChart,
  SuspendedRevenueChart,
  SuspendedOrderTypeChart,
  ChartSkeleton,
  withChartSuspense,
} from "./LazyCharts";

// Hooks
export { useDashboardData } from "./useDashboardData";
export type { UseDashboardDataReturn, DashboardMetrics } from "./useDashboardData";
