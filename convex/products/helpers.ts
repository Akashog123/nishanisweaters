import { Doc } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

/**
 * Calculate price bucket for indexed range queries.
 * Buckets: "0-1000", "1000-2500", "2500-5000", "5000-10000", "10000+"
 *
 * This enables efficient price filtering using equality indexes instead of
 * range scans, which Convex doesn't natively support for pagination.
 */
export function calculatePriceBucket(price: number): string {
  if (price < 1000) return "0-1000";
  if (price < 2500) return "1000-2500";
  if (price < 5000) return "2500-5000";
  if (price < 10000) return "5000-10000";
  return "10000+";
}

/**
 * Extract unique sizes and colors from variants for denormalized fields.
 * These arrays enable indexed filtering without scanning variant arrays.
 */
export function extractVariantAttributes(variants: { size: string; color: string }[]): {
  availableSizes: string[];
  availableColors: string[];
} {
  const sizesSet = new Set<string>();
  const colorsSet = new Set<string>();

  for (const variant of variants) {
    sizesSet.add(variant.size);
    colorsSet.add(variant.color);
  }

  return {
    availableSizes: Array.from(sizesSet).sort(),
    availableColors: Array.from(colorsSet).sort(),
  };
}

/**
 * Check if the current user can view wholesale/bulk prices.
 * Now returns true for everyone - bulk prices are public.
 */
export async function canViewWholesalePrices(_ctx: QueryCtx): Promise<boolean> {
  // Bulk prices are now public - anyone can view them
  return true;
}

/**
 * Strip wholesale pricing from product data for non-wholesale users.
 * SECURITY: Prevents price leakage to unauthorized users.
 */
export function sanitizeProductPricing<T extends Doc<"products">>(
  product: T,
  canSeeWholesalePrices: boolean
): Omit<T, "wholesalePrice"> & {
  wholesalePrice?: number;
} {
  if (canSeeWholesalePrices) {
    return product;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { wholesalePrice, ...rest } = product;
  return rest;
}
