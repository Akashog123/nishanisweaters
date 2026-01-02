/**
 * Admin Dashboard Components - Barrel Export
 *
 * This module exports all dashboard-related components and hooks
 * for clean imports throughout the application.
 *
 * IMPORTANT: Chart components are ONLY exported as lazy-loaded versions
 * to prevent bundling recharts in the main bundle and avoid circular dependencies.
 *
 * Usage:
 * import { MetricCard, SuspendedRevenueChart, useDashboardData } from "@/components/admin/dashboard";
 *
 * DO NOT import RevenueChart or OrderTypeChart directly - use lazy versions only.
 */

// Components
export { MetricCard } from "./MetricCard";
export type { MetricCardProps } from "./MetricCard";

// Chart components are NOT exported directly to prevent circular dependencies
// and ensure code splitting works correctly. Use lazy versions only.
// REMOVED: export { RevenueChart } from "./RevenueChart";
// REMOVED: export { OrderTypeChart } from "./OrderTypeChart";

// Type exports only - these don't include the implementation
export type { RevenueChartProps, RevenueChartDataPoint } from "./RevenueChart";
export type { OrderTypeChartProps, OrderTypeDataPoint } from "./OrderTypeChart";

export { OrderStatusBadge, PaymentStatusBadge, DisputeStatusBadge } from "./StatusBadges";

// Lazy-loaded chart components (ONLY way to import charts)
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
