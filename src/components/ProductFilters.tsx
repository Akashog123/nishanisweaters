import { useState } from "react";
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

  if (!filterOptions) {
    return null;
  }

  const handleSizeToggle = (size: string) => {
    const newSizes = filters.sizes.includes(size)
      ? filters.sizes.filter((s) => s !== size)
      : [...filters.sizes, size];
    onFiltersChange({ ...filters, sizes: newSizes });
  };

  const handleColorToggle = (color: string) => {
    const newColors = filters.colors.includes(color)
      ? filters.colors.filter((c) => c !== color)
      : [...filters.colors, color];
    onFiltersChange({ ...filters, colors: newColors });
  };

  const handlePriceChange = (value: number[]) => {
    setLocalPriceRange([value[0], value[1]]);
  };

  const handlePriceCommit = () => {
    onFiltersChange({
      ...filters,
      minPrice: localPriceRange[0],
      maxPrice: localPriceRange[1],
    });
  };

  const handleSortChange = (value: string) => {
    onFiltersChange({
      ...filters,
      sortBy: value as FilterState["sortBy"],
    });
  };

  const clearAllFilters = () => {
    setLocalPriceRange([filterOptions.priceRange.min, filterOptions.priceRange.max]);
    onFiltersChange({
      sizes: [],
      colors: [],
      minPrice: undefined,
      maxPrice: undefined,
      sortBy: undefined,
    });
  };

  const activeFilterCount =
    filters.sizes.length +
    filters.colors.length +
    (filters.minPrice !== undefined || filters.maxPrice !== undefined ? 1 : 0);

  const FilterContent = () => (
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
                    onCheckedChange={() => handleSizeToggle(size)}
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
                    onCheckedChange={() => handleColorToggle(color)}
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
                onValueChange={handlePriceChange}
                onValueCommit={handlePriceCommit}
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

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      {/* Desktop Filters */}
      <div className="hidden lg:flex items-center gap-4">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs">
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
            <div className="mt-6">
              <FilterContent />
            </div>
            <SheetFooter className="mt-6">
              <Button onClick={() => setIsOpen(false)} className="w-full">
                Show {productCount ?? 0} Products
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Active filter tags */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
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

      {/* Mobile Filters */}
      <div className="lg:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
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
            <div className="mt-6 overflow-y-auto max-h-[calc(80vh-150px)]">
              <FilterContent />
            </div>
            <SheetFooter className="mt-6">
              <Button onClick={() => setIsOpen(false)} className="w-full">
                Show {productCount ?? 0} Products
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Sort Dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">Sort by:</span>
        <Select value={filters.sortBy || ""} onValueChange={handleSortChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Featured" />
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
