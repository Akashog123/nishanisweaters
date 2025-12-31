import { useState, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidersHorizontal, X } from "lucide-react";
import { formatCurrency } from "@/lib/constants";

export interface FilterState {
  sizes: string[];
  colors: string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "price_asc" | "price_desc" | "name_asc" | "name_desc" | "newest" | "popularity";
}

interface ProductFiltersProps {
  filterOptions: {
    sizes: string[];
    colors: string[];
    priceRange: { min: number; max: number };
  } | undefined;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  productCount?: number;
}

// Memoized FilterContent component extracted outside parent to prevent recreation on each render
// This improves INP (Interaction to Next Paint) by reducing JavaScript execution during interactions
interface FilterContentProps {
  filterOptions: {
    sizes: string[];
    colors: string[];
    priceRange: { min: number; max: number };
  };
  filters: FilterState;
  localPriceRange: [number, number];
  onSizeToggle: (size: string) => void;
  onColorToggle: (color: string) => void;
  onPriceChange: (value: number[]) => void;
  onPriceCommit: () => void;
}

const FilterContent = memo(function FilterContent({
  filterOptions,
  filters,
  localPriceRange,
  onSizeToggle,
  onColorToggle,
  onPriceChange,
  onPriceCommit,
}: FilterContentProps) {
  return (
    <div className="space-y-6">
      <Accordion type="multiple" defaultValue={["sizes", "colors", "price"]} className="w-full">
        {/* Sizes Filter */}
        <AccordionItem value="sizes">
          <AccordionTrigger className="text-sm font-medium">
            Sizes {filters.sizes.length > 0 && `(${filters.sizes.length})`}
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-3 gap-2 pt-2">
              {filterOptions.sizes.map((size) => (
                <div key={size} className="flex items-center space-x-2">
                  <Checkbox
                    id={`size-${size}`}
                    checked={filters.sizes.includes(size)}
                    onCheckedChange={() => onSizeToggle(size)}
                  />
                  <Label
                    htmlFor={`size-${size}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {size}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Colors Filter */}
        <AccordionItem value="colors">
          <AccordionTrigger className="text-sm font-medium">
            Colors {filters.colors.length > 0 && `(${filters.colors.length})`}
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {filterOptions.colors.map((color) => (
                <div key={color} className="flex items-center space-x-2">
                  <Checkbox
                    id={`color-${color}`}
                    checked={filters.colors.includes(color)}
                    onCheckedChange={() => onColorToggle(color)}
                  />
                  <Label
                    htmlFor={`color-${color}`}
                    className="text-sm font-normal cursor-pointer flex items-center gap-2"
                  >
                    <span
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: color.toLowerCase() }}
                    />
                    {color}
                  </Label>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Price Range Filter */}
        <AccordionItem value="price">
          <AccordionTrigger className="text-sm font-medium">
            Price Range
          </AccordionTrigger>
          <AccordionContent>
            <div className="pt-4 px-2">
              <Slider
                value={localPriceRange}
                min={filterOptions.priceRange.min}
                max={filterOptions.priceRange.max}
                step={100}
                onValueChange={onPriceChange}
                onValueCommit={onPriceCommit}
                className="mb-4"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatCurrency(localPriceRange[0])}</span>
                <span>{formatCurrency(localPriceRange[1])}</span>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
});

export function ProductFilters({
  filterOptions,
  filters,
  onFiltersChange,
  productCount,
}: ProductFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([
    filters.minPrice ?? filterOptions?.priceRange.min ?? 0,
    filters.maxPrice ?? filterOptions?.priceRange.max ?? 10000,
  ]);

  // Memoized handlers to prevent unnecessary re-renders of FilterContent
  const handleSizeToggle = useCallback((size: string) => {
    const newSizes = filters.sizes.includes(size)
      ? filters.sizes.filter((s) => s !== size)
      : [...filters.sizes, size];
    onFiltersChange({ ...filters, sizes: newSizes });
  }, [filters, onFiltersChange]);

  const handleColorToggle = useCallback((color: string) => {
    const newColors = filters.colors.includes(color)
      ? filters.colors.filter((c) => c !== color)
      : [...filters.colors, color];
    onFiltersChange({ ...filters, colors: newColors });
  }, [filters, onFiltersChange]);

  const handlePriceChange = useCallback((value: number[]) => {
    setLocalPriceRange([value[0], value[1]]);
  }, []);

  const handlePriceCommit = useCallback(() => {
    onFiltersChange({
      ...filters,
      minPrice: localPriceRange[0],
      maxPrice: localPriceRange[1],
    });
  }, [filters, localPriceRange, onFiltersChange]);

  const handleSortChange = useCallback((value: string) => {
    onFiltersChange({
      ...filters,
      sortBy: value as FilterState["sortBy"],
    });
  }, [filters, onFiltersChange]);

  const clearAllFilters = useCallback(() => {
    if (!filterOptions) return;
    setLocalPriceRange([filterOptions.priceRange.min, filterOptions.priceRange.max]);
    onFiltersChange({
      sizes: [],
      colors: [],
      minPrice: undefined,
      maxPrice: undefined,
      sortBy: undefined,
    });
  }, [filterOptions, onFiltersChange]);

  if (!filterOptions) {
    return null;
  }

  const activeFilterCount =
    filters.sizes.length +
    filters.colors.length +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0);

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      {/* Filter Button and Sheet - Single instance for all screen sizes */}
      <div className="flex items-center gap-4">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between">
                Filters
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-sm text-muted-foreground"
                  >
                    Clear all
                  </Button>
                )}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-6 overflow-y-auto max-h-[calc(100vh-200px)]">
              <FilterContent
                filterOptions={filterOptions}
                filters={filters}
                localPriceRange={localPriceRange}
                onSizeToggle={handleSizeToggle}
                onColorToggle={handleColorToggle}
                onPriceChange={handlePriceChange}
                onPriceCommit={handlePriceCommit}
              />
            </div>
            <SheetFooter className="mt-6">
              <Button onClick={() => setIsOpen(false)} className="w-full">
                Show {productCount ?? 0} Products
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Active filter tags - Desktop only */}
        {activeFilterCount > 0 && (
          <div className="hidden lg:flex items-center gap-2 flex-wrap">
            {filters.sizes.map((size) => (
              <Button
                key={size}
                variant="secondary"
                size="sm"
                className="h-7 gap-1"
                onClick={() => handleSizeToggle(size)}
              >
                {size}
                <X className="h-3 w-3" />
              </Button>
            ))}
            {filters.colors.map((color) => (
              <Button
                key={color}
                variant="secondary"
                size="sm"
                className="h-7 gap-1"
                onClick={() => handleColorToggle(color)}
              >
                {color}
                <X className="h-3 w-3" />
              </Button>
            ))}
            {(filters.minPrice !== undefined || filters.maxPrice !== undefined) && (
              <Button
                variant="secondary"
                size="sm"
                className="h-7 gap-1"
                onClick={() =>
                  onFiltersChange({ ...filters, minPrice: undefined, maxPrice: undefined })
                }
              >
                {formatCurrency(filters.minPrice ?? 0)} - {formatCurrency(filters.maxPrice ?? 10000)}
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Sort Dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">Sort by:</span>
        <Select value={filters.sortBy || ""} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[140px] sm:w-[160px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="popularity">Featured</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price_asc">Price: Low to High</SelectItem>
            <SelectItem value="price_desc">Price: High to Low</SelectItem>
            <SelectItem value="name_asc">Name: A to Z</SelectItem>
            <SelectItem value="name_desc">Name: Z to A</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
