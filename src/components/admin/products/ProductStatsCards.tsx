import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Stats can be provided directly from the server query (preferred)
// or calculated from products array (legacy fallback)
interface ProductStats {
  totalCount: number;
  activeCount: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}

interface ProductStatsCardsProps {
  stats: ProductStats;
}

export function ProductStatsCards({ stats }: ProductStatsCardsProps) {

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Total Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-green-600">
            In Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {stats.inStockCount}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-amber-600">
            Low Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {stats.lowStockCount}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-red-600">
            Out of Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {stats.outOfStockCount}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
