/**
 * Lazy-loaded Chart Components
 *
 * These components wrap the Recharts-based chart components with React.lazy()
 * to enable code splitting. This keeps the heavy Recharts library out of the
 * initial bundle and only loads it when the admin dashboard is accessed.
 *
 * PERFORMANCE IMPACT:
 * - Recharts + d3 dependencies are ~200KB+ gzipped
 * - By lazy loading, we reduce initial bundle size significantly
 * - Charts are only loaded when the admin dashboard is rendered
 *
 * Usage:
 * ```tsx
 * import { LazyRevenueChart, LazyOrderTypeChart, ChartSkeleton } from "@/components/admin/dashboard/LazyCharts";
 *
 * <Suspense fallback={<ChartSkeleton />}>
 *   <LazyRevenueChart data={chartData} />
 * </Suspense>
 * ```
 */

import { lazy, Suspense, memo, ComponentType } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Re-export types for convenience
export type { RevenueChartProps, RevenueChartDataPoint } from "./RevenueChart";
export type { OrderTypeChartProps, OrderTypeDataPoint } from "./OrderTypeChart";

/**
 * ChartSkeleton - Loading placeholder for charts
 *
 * Displays an animated skeleton that matches the chart card layout
 * to prevent CLS (Cumulative Layout Shift) during lazy loading.
 */
export const ChartSkeleton = memo(function ChartSkeleton({
  height = 300,
  title = "Loading chart...",
}: {
  height?: number;
  title?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="animate-pulse bg-muted rounded-md flex items-center justify-center"
          style={{ height }}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 border-2 border-muted-foreground/20 border-t-muted-foreground rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading chart...</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * Lazy-loaded RevenueChart
 *
 * Imports the RevenueChart component and its Recharts dependencies only when needed.
 */
export const LazyRevenueChart = lazy(() =>
  import("./RevenueChart").then((module) => ({
    default: module.RevenueChart,
  }))
);

/**
 * Lazy-loaded OrderTypeChart
 *
 * Imports the OrderTypeChart component and its Recharts dependencies only when needed.
 */
export const LazyOrderTypeChart = lazy(() =>
  import("./OrderTypeChart").then((module) => ({
    default: module.OrderTypeChart,
  }))
);

/**
 * Higher-order component that wraps a lazy component with Suspense and ChartSkeleton
 *
 * This provides a convenient way to use lazy charts without manually wrapping
 * each one in Suspense.
 *
 * @example
 * const SuspendedRevenueChart = withChartSuspense(LazyRevenueChart);
 * <SuspendedRevenueChart data={data} title="Revenue" />
 */
export function withChartSuspense<P extends object>(
  LazyComponent: ComponentType<P>,
  skeletonTitle?: string
) {
  return memo(function SuspendedChart(props: P) {
    return (
      <Suspense fallback={<ChartSkeleton title={skeletonTitle} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  });
}

/**
 * Pre-wrapped lazy chart components with Suspense
 *
 * These can be used directly without manually wrapping in Suspense.
 * Useful for quick integration in dashboards.
 */
export const SuspendedRevenueChart = withChartSuspense(
  LazyRevenueChart,
  "Loading revenue trend..."
);

export const SuspendedOrderTypeChart = withChartSuspense(
  LazyOrderTypeChart,
  "Loading order breakdown..."
);
