import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import { CategoryFilterType, StockFilterType } from "./types";
import { useActiveCategories } from "../../../hooks/useCategories";

interface ProductFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  categoryFilter: CategoryFilterType;
  onCategoryChange: (value: CategoryFilterType) => void;
  stockFilter: StockFilterType;
  onStockChange: (value: StockFilterType) => void;
}

export function ProductFilters({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  stockFilter,
  onStockChange,
}: ProductFiltersProps) {
  const categoriesQuery = useActiveCategories();
  const categories = categoriesQuery || [];

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select
              value={categoryFilter}
              onValueChange={(value) => onCategoryChange(value as CategoryFilterType)}
            >
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat._id} value={cat.slug}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={stockFilter}
              onValueChange={(value) => onStockChange(value as StockFilterType)}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
