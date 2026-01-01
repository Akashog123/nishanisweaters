/**
 * Product filtering utilities
 * Extracted from products.ts to reduce complexity and improve maintainability
 */

import { Doc } from "../_generated/dataModel";
import { DatabaseReader } from "../_generated/server";

/**
 * Arguments for index selection
 */
export interface IndexSelectionArgs {
  category?: string;
  featured?: boolean;
  bestseller?: boolean;
  newArrival?: boolean;
}

/**
 * Arguments for boolean filters
 */
export interface BooleanFilterArgs {
  category?: string;
  featured?: boolean;
  bestseller?: boolean;
  newArrival?: boolean;
}

/**
 * Arguments for price filtering
 */
export interface PriceFilterArgs {
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Arguments for size/color filtering
 */
export interface SizeColorFilterArgs {
  sizes?: string[];
  colors?: string[];
}

/**
 * Sort options
 */
export type SortBy =
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "name_desc"
  | "newest"
  | "popularity";

/**
 * Pagination result
 */
export interface PaginationResult<T> {
  page: T[];
  continueCursor: string | null;
  isDone: boolean;
  totalCount?: number;
}

/**
 * Select the optimal index based on filter arguments.
 * Uses the most selective index to minimize query scope.
 *
 * Priority order:
 * 1. by_category_active (if category specified)
 * 2. by_featured_active (if featured specified)
 * 3. by_bestseller_active (if bestseller specified)
 * 4. by_new_arrival_active (if newArrival specified)
 * 5. by_is_active (default fallback)
 */
export function selectOptimalIndex(
  db: DatabaseReader,
  args: IndexSelectionArgs
) {
  if (args.category !== undefined) {
    return db
      .query("products")
      .withIndex("by_category_active", (q) =>
        q.eq("category", args.category!).eq("isActive", true)
      );
  }

  if (args.featured !== undefined) {
    return db
      .query("products")
      .withIndex("by_featured_active", (q) =>
        q.eq("featured", args.featured!).eq("isActive", true)
      );
  }

  if (args.bestseller !== undefined) {
    return db
      .query("products")
      .withIndex("by_bestseller_active", (q) =>
        q.eq("bestseller", args.bestseller!).eq("isActive", true)
      );
  }

  if (args.newArrival !== undefined) {
    return db
      .query("products")
      .withIndex("by_new_arrival_active", (q) =>
        q.eq("newArrival", args.newArrival!).eq("isActive", true)
      );
  }

  return db
    .query("products")
    .withIndex("by_is_active", (q) => q.eq("isActive", true));
}

/**
 * Apply boolean filters (featured, bestseller, newArrival) to products.
 * Handles the complex logic of combining multiple boolean filters.
 *
 * LOGIC:
 * - If category is used as primary index, apply other boolean filters
 * - If featured is used as primary index, apply bestseller/newArrival
 * - If bestseller is used as primary index, apply featured/newArrival
 * - If newArrival is used as primary index, apply featured/bestseller
 */
export function applyBooleanFilters(
  products: Doc<"products">[],
  args: BooleanFilterArgs
): Doc<"products">[] {
  let filtered = products;

  // When category is the primary index, apply all boolean filters
  if (args.category !== undefined) {
    if (args.featured !== undefined) {
      filtered = filtered.filter(p => p.featured === args.featured);
    }
    if (args.bestseller !== undefined) {
      filtered = filtered.filter(p => p.bestseller === args.bestseller);
    }
    if (args.newArrival !== undefined) {
      filtered = filtered.filter(p => p.newArrival === args.newArrival);
    }
    return filtered;
  }

  // When featured is the primary index, apply other boolean filters
  if (args.featured !== undefined) {
    if (args.bestseller !== undefined) {
      filtered = filtered.filter(p => p.bestseller === args.bestseller);
    }
    if (args.newArrival !== undefined) {
      filtered = filtered.filter(p => p.newArrival === args.newArrival);
    }
    return filtered;
  }

  // When bestseller is the primary index, apply other boolean filters
  if (args.bestseller !== undefined) {
    if (args.newArrival !== undefined) {
      filtered = filtered.filter(p => p.newArrival === args.newArrival);
    }
    return filtered;
  }

  // No additional filtering needed for newArrival as primary index
  return filtered;
}

/**
 * Apply price range filters to products.
 * Filters products by retail price within the specified range.
 */
export function applyPriceFilter(
  products: Doc<"products">[],
  args: PriceFilterArgs
): Doc<"products">[] {
  let filtered = products;

  if (args.minPrice !== undefined) {
    filtered = filtered.filter(p => p.retailPrice >= args.minPrice!);
  }

  if (args.maxPrice !== undefined) {
    filtered = filtered.filter(p => p.retailPrice <= args.maxPrice!);
  }

  return filtered;
}

/**
 * Apply size and color filters to products.
 * Uses denormalized fields (availableSizes, availableColors) when available,
 * falls back to scanning variants for legacy products.
 *
 * OPTIMIZATION: O(1) array intersection vs O(M) variant iteration
 */
export function applySizeColorFilters(
  products: Doc<"products">[],
  args: SizeColorFilterArgs
): Doc<"products">[] {
  let filtered = products;

  // Filter by sizes using denormalized availableSizes field
  if (args.sizes && args.sizes.length > 0) {
    const sizesSet = new Set(args.sizes);
    filtered = filtered.filter(p => {
      // Use denormalized field if available (new products)
      if (p.availableSizes && p.availableSizes.length > 0) {
        return p.availableSizes.some(size => sizesSet.has(size));
      }
      // Fallback for legacy products without denormalized fields
      return p.variants.some(v => sizesSet.has(v.size));
    });
  }

  // Filter by colors using denormalized availableColors field
  if (args.colors && args.colors.length > 0) {
    const colorsSet = new Set(args.colors);
    filtered = filtered.filter(p => {
      // Use denormalized field if available (new products)
      if (p.availableColors && p.availableColors.length > 0) {
        return p.availableColors.some(color => colorsSet.has(color));
      }
      // Fallback for legacy products without denormalized fields
      return p.variants.some(v => colorsSet.has(v.color));
    });
  }

  return filtered;
}

/**
 * Sort products by the specified sort option.
 * Modifies the array in-place for performance.
 */
export function sortProducts(
  products: Doc<"products">[],
  sortBy?: SortBy
): Doc<"products">[] {
  if (!sortBy) {
    return products;
  }

  switch (sortBy) {
    case "price_asc":
      products.sort((a, b) => a.retailPrice - b.retailPrice);
      break;
    case "price_desc":
      products.sort((a, b) => b.retailPrice - a.retailPrice);
      break;
    case "name_asc":
      products.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name_desc":
      products.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "newest":
      products.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case "popularity":
      products.sort((a, b) => {
        if (a.bestseller && !b.bestseller) return -1;
        if (!a.bestseller && b.bestseller) return 1;
        return 0;
      });
      break;
  }

  return products;
}

/**
 * Paginate results using manual cursor-based pagination.
 * Cursor format: base64-encoded index position in the filtered array.
 *
 * @returns Paginated result with page, cursor, and done status
 */
export function paginateResults<T>(
  items: T[],
  limit: number,
  cursor?: string
): PaginationResult<T> {
  let startIndex = 0;

  // Decode cursor to get start position
  if (cursor) {
    try {
      startIndex = parseInt(atob(cursor), 10);
      if (isNaN(startIndex) || startIndex < 0) {
        startIndex = 0;
      }
    } catch {
      startIndex = 0;
    }
  }

  const endIndex = Math.min(startIndex + limit, items.length);
  const page = items.slice(startIndex, endIndex);
  const isDone = endIndex >= items.length;
  const continueCursor = isDone ? null : btoa(endIndex.toString());

  return {
    page,
    continueCursor,
    isDone,
    totalCount: items.length,
  };
}

/**
 * Check if the query requires complex filtering that needs collect-then-filter approach.
 * Complex filters include: sizes, colors, price range, or custom sorting.
 */
export function hasComplexFilters(args: {
  sizes?: string[];
  colors?: string[];
  minPrice?: number;
  maxPrice?: number;
  sortBy?: SortBy;
}): boolean {
  return (
    (args.sizes && args.sizes.length > 0) ||
    (args.colors && args.colors.length > 0) ||
    args.minPrice !== undefined ||
    args.maxPrice !== undefined ||
    args.sortBy !== undefined
  );
}

/**
 * Extract unique sizes and colors from products using denormalized fields.
 * Falls back to variant iteration for legacy products.
 *
 * OPTIMIZATION: O(N) instead of O(N*M) where M = avg variants per product
 */
export function extractFilterOptions(products: Doc<"products">[]): {
  sizes: string[];
  colors: string[];
  priceRange: { min: number; max: number };
} {
  const sizesSet = new Set<string>();
  const colorsSet = new Set<string>();
  let minPrice = Infinity;
  let maxPrice = 0;

  for (const product of products) {
    // Track price range
    if (product.retailPrice < minPrice) minPrice = product.retailPrice;
    if (product.retailPrice > maxPrice) maxPrice = product.retailPrice;

    // Extract sizes using denormalized field or fallback to variants
    if (product.availableSizes) {
      for (const size of product.availableSizes) {
        sizesSet.add(size);
      }
    } else {
      // Fallback for legacy products without denormalized fields
      for (const variant of product.variants) {
        sizesSet.add(variant.size);
      }
    }

    // Extract colors using denormalized field or fallback to variants
    if (product.availableColors) {
      for (const color of product.availableColors) {
        colorsSet.add(color);
      }
    } else {
      // Fallback for legacy products without denormalized fields
      for (const variant of product.variants) {
        colorsSet.add(variant.color);
      }
    }
  }

  return {
    sizes: Array.from(sizesSet),
    colors: Array.from(colorsSet),
    priceRange: {
      min: minPrice === Infinity ? 0 : minPrice,
      max: maxPrice === 0 ? 10000 : maxPrice,
    },
  };
}

/**
 * Sort sizes in logical clothing size order.
 * Handles standard sizes (XS-XXXL) and custom sizes.
 */
export function sortSizes(sizes: string[], sizeOrder: readonly string[]): string[] {
  return sizes.sort((a, b) => {
    const aIndex = sizeOrder.indexOf(a);
    const bIndex = sizeOrder.indexOf(b);

    // Both sizes are in the standard order
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // Only a is in standard order (b is custom)
    if (aIndex !== -1) return -1;

    // Only b is in standard order (a is custom)
    if (bIndex !== -1) return 1;

    // Both are custom sizes, sort alphabetically
    return a.localeCompare(b);
  });
}
