import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Hook to get all active categories.
 * This is the single source of truth — other hooks derive from this.
 * Convex deduplicates identical queries, so multiple components
 * using this hook share a single WebSocket subscription.
 */
export function useActiveCategories() {
  return useQuery(api.categories.getActiveCategories);
}

/**
 * Hook to get categories for header navigation.
 * Filters from the shared getActiveCategories subscription
 * instead of making a separate query — saves one WebSocket subscription.
 */
export function useHeaderCategories() {
  const allCategories = useActiveCategories();

  return useMemo(() => {
    if (!allCategories) return undefined;
    return allCategories.filter((cat) => cat.showInHeader);
  }, [allCategories]);
}

/**
 * Hook to get a single category by slug
 */
export function useCategoryBySlug(slug: string | undefined) {
  return useQuery(
    api.categories.getCategoryBySlug,
    slug ? { slug } : "skip"
  );
}
