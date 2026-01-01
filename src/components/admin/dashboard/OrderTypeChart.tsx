import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/formatting";

/**
 * OrderTypeChart - Bar chart comparing retail vs wholesale revenue
 *
 * Extracted from AdminDashboard for reusability and maintainability.
 * Displays revenue breakdown by order type with consistent styling.
 */

export interface OrderTypeDataPoint {
  /** Order type name (e.g., "Retail", "Wholesale") */
  name: string;
  /** Revenue value */
  value: number;
  /** Order count */
  count: number;
}

export interface OrderTypeChartProps {
  /** Array of order type data points */
  data: OrderTypeDataPoint[];
  /** Chart title (default: "Order Type Breakdown") */
  title?: string;
  /** Chart description/subtitle */
  description?: string;
  /** Chart height in pixels (default: 300) */
  height?: number;
  /** Bar color (default: #2563eb - blue) */
  barColor?: string;
}

export function OrderTypeChart({
  data,
  title = "Order Type Breakdown",
  description = "Retail vs Wholesale revenue",
  height = 300,
  barColor = "#2563eb",
}: OrderTypeChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis
                fontSize={12}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  name === "value" ? formatCurrency(value) : value,
                  name === "value" ? "Revenue" : "Orders",
                ]}
                labelStyle={{ color: "#374151" }}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
              />
              <Bar
                dataKey="value"
                fill={barColor}
                radius={[4, 4, 0, 0]}
                name="value"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export default OrderTypeChart;
