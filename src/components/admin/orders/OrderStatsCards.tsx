import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderStatsCardsProps } from "./types";

interface StatCardProps {
  title: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  colorClass?: string;
  alertStyle?: boolean;
  subtitle?: string;
}

const StatCard = ({
  title,
  count,
  isActive,
  onClick,
  colorClass = "",
  alertStyle = false,
  subtitle,
}: StatCardProps) => (
  <Card
    className={`cursor-pointer transition-colors ${
      isActive ? "ring-2 ring-primary" : ""
    } ${alertStyle ? "border-red-500 bg-red-50 dark:bg-red-950/30" : ""}`}
    onClick={onClick}
  >
    <CardHeader className="pb-2">
      <CardTitle
        className={`text-sm font-medium ${colorClass} ${
          alertStyle ? "flex items-center gap-1" : ""
        }`}
      >
        {alertStyle && "Warning"} {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${colorClass}`}>{count}</div>
      {subtitle && (
        <p className="text-xs text-red-500 mt-1">{subtitle}</p>
      )}
    </CardContent>
  </Card>
);

export function OrderStatsCards({
  counts,
  statusFilter,
  paymentFilter,
  onFilterChange,
}: OrderStatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-8">
      {/* All Orders */}
      <StatCard
        title="All Orders"
        count={counts.all}
        isActive={statusFilter === "all" && paymentFilter === "all"}
        onClick={() => onFilterChange("all", "all")}
      />

      {/* Disputed Alert Card - Only shown if there are disputes */}
      {counts.disputed > 0 && (
        <StatCard
          title="Disputed"
          count={counts.disputed}
          isActive={paymentFilter === "disputed"}
          onClick={() => onFilterChange("all", "disputed")}
          colorClass="text-red-600"
          alertStyle={true}
          subtitle="Needs attention"
        />
      )}

      {/* Pending */}
      <StatCard
        title="Pending"
        count={counts.pending}
        isActive={statusFilter === "pending"}
        onClick={() => onFilterChange("pending", "all")}
        colorClass="text-amber-600"
      />

      {/* Confirmed */}
      <StatCard
        title="Confirmed"
        count={counts.confirmed}
        isActive={statusFilter === "confirmed"}
        onClick={() => onFilterChange("confirmed", "all")}
        colorClass="text-teal-600"
      />

      {/* Processing */}
      <StatCard
        title="Processing"
        count={counts.processing}
        isActive={statusFilter === "processing"}
        onClick={() => onFilterChange("processing", "all")}
        colorClass="text-blue-600"
      />

      {/* Shipped */}
      <StatCard
        title="Shipped"
        count={counts.shipped}
        isActive={statusFilter === "shipped"}
        onClick={() => onFilterChange("shipped", "all")}
        colorClass="text-purple-600"
      />

      {/* Delivered */}
      <StatCard
        title="Delivered"
        count={counts.delivered}
        isActive={statusFilter === "delivered"}
        onClick={() => onFilterChange("delivered", "all")}
        colorClass="text-green-600"
      />

      {/* Cancelled */}
      <StatCard
        title="Cancelled"
        count={counts.cancelled}
        isActive={statusFilter === "cancelled"}
        onClick={() => onFilterChange("cancelled", "all")}
        colorClass="text-gray-600"
      />
    </div>
  );
}

export default OrderStatsCards;
