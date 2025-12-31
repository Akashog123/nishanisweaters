/**
 * Caching Strategies for Convex Backend
 *
 * CONVEX CACHING BEHAVIOR:
 * ========================
 * Convex automatically caches query results at the infrastructure level.
 * When data changes, subscribed queries are automatically invalidated
 * and re-run. This is different from traditional REST API caching.
 *
 * BUILT-IN CACHING:
 * - Query results are cached and reused for identical arguments
 * - Real-time subscriptions automatically update when data changes
 * - No explicit cache invalidation needed for most use cases
 *
 * WHEN TO ADD EXPLICIT CACHING:
 * 1. Computed aggregations that are expensive to calculate
 * 2. External API responses (e.g., exchange rates, third-party data)
 * 3. Data that changes infrequently but is read often
 *
 * This module provides utilities for caching patterns that go beyond
 * Convex's built-in caching.
 */

import { MutationCtx, QueryCtx } from "../_generated/server";

// ============================================
// TYPES
// ============================================

export interface CacheEntry<T> {
  value: T;
  cachedAt: number;
  expiresAt: number;
  key: string;
}

export interface CacheConfig {
  /** Cache TTL in milliseconds */
  ttlMs: number;
  /** Cache key prefix for namespacing */
  prefix: string;
}

// ============================================
// DEFAULT CONFIGURATIONS
// ============================================

/**
 * Recommended TTL values for different data types.
 *
 * GUIDELINES:
 * - Use shorter TTLs for data that affects pricing/inventory
 * - Use longer TTLs for configuration and metadata
 */
export const CACHE_TTLS = {
  /** Settings that rarely change (5 minutes) */
  SETTINGS: 5 * 60 * 1000,

  /** Filter options like available sizes/colors (2 minutes) */
  FILTER_OPTIONS: 2 * 60 * 1000,

  /** Category metadata (5 minutes) */
  CATEGORIES: 5 * 60 * 1000,

  /** External API responses (1 minute) */
  EXTERNAL_API: 60 * 1000,

  /** Analytics aggregations (10 minutes) */
  ANALYTICS: 10 * 60 * 1000,
};

// ============================================
// IN-MEMORY CACHE (For Action Context)
// ============================================

/**
 * Simple in-memory cache for use in Convex actions.
 *
 * NOTE: This cache is NOT shared across Convex instances.
 * Use for caching within a single action execution or
 * for short-lived data that can be recomputed.
 */
const memoryCache = new Map<string, CacheEntry<unknown>>();

/**
 * Get a value from the in-memory cache.
 */
export function getFromMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);

  if (!entry) {
    return null;
  }

  // Check if expired
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value as T;
}

/**
 * Set a value in the in-memory cache.
 */
export function setInMemoryCache<T>(
  key: string,
  value: T,
  ttlMs: number
): void {
  const now = Date.now();
  memoryCache.set(key, {
    key,
    value,
    cachedAt: now,
    expiresAt: now + ttlMs,
  });
}

/**
 * Clear expired entries from the in-memory cache.
 * Call periodically to prevent memory leaks.
 */
export function cleanupMemoryCache(): number {
  const now = Date.now();
  let cleanedCount = 0;

  for (const [key, entry] of memoryCache.entries()) {
    if (now > entry.expiresAt) {
      memoryCache.delete(key);
      cleanedCount++;
    }
  }

  return cleanedCount;
}

// ============================================
// CACHED QUERY PATTERN
// ============================================

/**
 * Wrapper for expensive queries that benefit from caching.
 *
 * This implements a stale-while-revalidate pattern:
 * 1. Check if cached value exists and is fresh
 * 2. If fresh, return cached value immediately
 * 3. If stale or missing, compute new value and cache it
 *
 * USAGE EXAMPLE:
 * ```typescript
 * const filterOptions = await cachedQuery(
 *   ctx,
 *   `filter-options:${category}`,
 *   CACHE_TTLS.FILTER_OPTIONS,
 *   async () => {
 *     // Expensive computation
 *     return await computeFilterOptions(ctx, category);
 *   }
 * );
 * ```
 */
export async function cachedQuery<T>(
  _ctx: QueryCtx,
  cacheKey: string,
  ttlMs: number,
  computeFn: () => Promise<T>
): Promise<T> {
  // Try to get from cache
  const cached = getFromMemoryCache<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // Compute fresh value
  const value = await computeFn();

  // Store in cache
  setInMemoryCache(cacheKey, value, ttlMs);

  return value;
}

// ============================================
// CACHE RECOMMENDATIONS
// ============================================

/**
 * CACHING RECOMMENDATIONS FOR THIS E-COMMERCE APP:
 *
 * 1. getFilterOptions Query
 *    - Currently: Collects all products and iterates variants
 *    - Recommendation: Cache result for 2-5 minutes
 *    - Reason: Filter options change infrequently (only on product updates)
 *    - Implementation: Use cachedQuery wrapper
 *
 * 2. Settings Queries (getTaxRate, getShippingConfig)
 *    - Currently: Queries settings table on every order
 *    - Recommendation: These already use efficient indexed lookups
 *    - Note: Convex's built-in caching handles this well
 *    - No additional caching needed
 *
 * 3. Product Listings
 *    - Currently: Uses indexes and pagination
 *    - Recommendation: Convex handles this well natively
 *    - No additional caching needed
 *
 * 4. Order Preview (getOrderPreview)
 *    - Currently: Fetches products and calculates totals
 *    - Recommendation: DO NOT cache (prices must be real-time)
 *    - Reason: Caching could lead to incorrect pricing
 *
 * 5. External API Responses (future)
 *    - If adding exchange rates or third-party data:
 *    - Use cachedQuery with 1-5 minute TTL
 *    - Implement stale-while-revalidate for better UX
 *
 * CONVEX-SPECIFIC CONSIDERATIONS:
 * - Convex queries are already cached at the infrastructure level
 * - Subscribed queries update automatically when data changes
 * - Only add explicit caching for computed aggregations
 * - Never cache inventory or pricing data (must be real-time)
 */

// ============================================
// STALE-WHILE-REVALIDATE PATTERN
// ============================================

/**
 * Advanced caching with stale-while-revalidate behavior.
 *
 * Returns stale data immediately while refreshing in the background.
 * Useful for data that can be slightly outdated for better perceived performance.
 *
 * NOTE: This pattern is less useful in Convex because subscriptions
 * already provide real-time updates. Consider using this only for:
 * - Expensive aggregations
 * - External API data
 * - Analytics dashboards
 */
export interface StaleWhileRevalidateResult<T> {
  value: T;
  isStale: boolean;
  cachedAt: number | null;
}

export async function staleWhileRevalidate<T>(
  cacheKey: string,
  ttlMs: number,
  staleMs: number, // How long stale data is acceptable
  computeFn: () => Promise<T>
): Promise<StaleWhileRevalidateResult<T>> {
  const cached = memoryCache.get(cacheKey);
  const now = Date.now();

  // If we have cached data and it's within the stale window
  if (cached && now < cached.expiresAt + staleMs) {
    const isStale = now > cached.expiresAt;

    // If stale, trigger background refresh (in Node.js action context)
    if (isStale) {
      // Fire and forget - refresh in background
      computeFn()
        .then((value) => {
          setInMemoryCache(cacheKey, value, ttlMs);
        })
        .catch(() => {
          // Ignore errors in background refresh
        });
    }

    return {
      value: cached.value as T,
      isStale,
      cachedAt: cached.cachedAt,
    };
  }

  // No cached data or too stale - compute fresh
  const value = await computeFn();
  setInMemoryCache(cacheKey, value, ttlMs);

  return {
    value,
    isStale: false,
    cachedAt: now,
  };
}
