import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { ProductVariant } from "./types";
import { getTotalStock, hasLowStock, isOutOfStock } from "./utils";

interface StockStatusProps {
  variants: ProductVariant[];
}

export function StockStatus({ variants }: StockStatusProps) {
  const totalStock = getTotalStock(variants);

  if (isOutOfStock(variants)) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Out of Stock
      </Badge>
    );
  }

  if (hasLowStock(variants)) {
    return (
      <Badge variant="outline" className="flex items-center gap-1 text-amber-600 border-amber-600">
        <AlertTriangle className="h-3 w-3" />
        Low Stock ({totalStock})
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-600">
      <CheckCircle className="h-3 w-3" />
      In Stock ({totalStock})
    </Badge>
  );
}
