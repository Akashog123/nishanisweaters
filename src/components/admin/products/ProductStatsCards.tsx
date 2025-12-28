import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Product } from "./types";
import { calculateProductStats } from "./utils";

interface ProductStatsCardsProps {
  products: Product[];
  lowStockCount: number;
}

export function ProductStatsCards({ products, lowStockCount }: ProductStatsCardsProps) {
  const stats = calculateProductStats(products);

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Total Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
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
            {stats.inStock}
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
            {lowStockCount}
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
            {stats.outOfStock}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
