import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/formatting";

/**
 * RevenueChart - Line chart showing daily revenue trends
 *
 * Extracted from AdminDashboard to improve maintainability and
 * enable reuse in other contexts (e.g., reports, exports).
 *
 * Uses Recharts with responsive container for automatic sizing.
 */

export interface RevenueChartDataPoint {
  /** Formatted date string for x-axis label */
  date: string;
  /** Revenue value in base currency units */
  revenue: number;
  /** Number of orders (optional, for tooltip) */
  orders?: number;
}

export interface RevenueChartProps {
  /** Array of data points to display */
  data: RevenueChartDataPoint[];
  /** Chart title (default: "Revenue Trend") */
  title?: string;
  /** Chart description/subtitle */
  description?: string;
  /** Chart height in pixels (default: 300) */
  height?: number;
  /** Line color (default: #2563eb - blue) */
  lineColor?: string;
}

export function RevenueChart({
  data,
  title = "Revenue Trend",
  description = "Daily revenue for the last 14 days",
  height = 300,
  lineColor = "#2563eb",
}: RevenueChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis
                fontSize={12}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => [
                  formatCurrency(value),
                  "Revenue",
                ]}
                labelStyle={{ color: "#374151" }}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke={lineColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default RevenueChart;
