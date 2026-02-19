import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Hook to get categories for header navigation
 * Returns only active categories marked to show in header
 */
export function useHeaderCategories() {
  return useQuery(api.categories.getHeaderCategories);
}

/**
 * Hook to get all active categories
 * Used for product filters, dropdowns, etc.
 */
export function useActiveCategories() {
  return useQuery(api.categories.getActiveCategories);
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
