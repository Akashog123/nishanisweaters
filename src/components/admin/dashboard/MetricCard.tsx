import { LucideIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * MetricCard - Reusable dashboard metric display component
 *
 * Extracts the repeated Card pattern from AdminDashboard into a single
 * configurable component. Supports:
 * - Custom icons
 * - Trend indicators (up/down percentages)
 * - Subtitles for additional context
 * - Custom value styling
 */

interface TrendIndicator {
  /** Display value like "+12.5%" or "-3.2%" */
  value: string;
  /** Direction determines the color (up=green, down=red) */
  direction: "up" | "down";
  /** Optional label after the trend value */
  label?: string;
}

export interface MetricCardProps {
  /** Card title displayed in the header */
  title: string;
  /** Main value to display (can be formatted string or number) */
  value: string | number;
  /** Lucide icon component to display in header */
  icon: LucideIcon;
  /** Optional trend indicator showing change from previous period */
  trend?: TrendIndicator;
  /** Optional subtitle text below the main value */
  subtitle?: string;
  /** Optional className for the value text (e.g., "text-amber-500" for warnings) */
  valueClassName?: string;
  /** Optional className for the subtitle (e.g., for colored pending counts) */
  subtitleClassName?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  subtitle,
  valueClassName,
  subtitleClassName,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>
        {trend && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span
              className={cn(
                trend.direction === "up" ? "text-green-500" : "text-red-500"
              )}
            >
              {trend.value}
            </span>
            {trend.label && <span>{trend.label}</span>}
          </p>
        )}
        {subtitle && !trend && (
          <p className={cn("text-xs text-muted-foreground", subtitleClassName)}>
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default MetricCard;
