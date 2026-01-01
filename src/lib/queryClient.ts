/**
 * React Query Client Configuration
 *
 * Centralized configuration for TanStack Query (React Query).
 * Provides consistent caching, retry, and error handling behavior.
 */

import { QueryClient, QueryClientConfig } from "@tanstack/react-query";

/**
 * Default query client options
 * Using DefaultOptions type for proper type inference
 */
const defaultOptions = {
  queries: {
    // Stale time: How long data is considered fresh (5 minutes)
    staleTime: 5 * 60 * 1000,

    // Cache time: How long inactive data stays in cache (30 minutes)
    gcTime: 30 * 60 * 1000,

    // Retry configuration
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors (client errors)
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (
          message.includes("not found") ||
          message.includes("unauthorized") ||
          message.includes("forbidden") ||
          message.includes("validation")
        ) {
          return false;
        }
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },

    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch behavior
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
  },
  mutations: {
    // Don't retry mutations by default (could cause duplicate operations)
    retry: false,
  },
};

/**
 * Create and export the query client instance
 */
export const queryClient = new QueryClient({
  defaultOptions,
});

/**
 * Factory function for creating query clients with custom config
 * Useful for testing or different environments
 */
export function createQueryClient(
  overrides?: Partial<QueryClientConfig["defaultOptions"]>
): QueryClient {
  return new QueryClient({
    defaultOptions: {
      ...defaultOptions,
      queries: {
        ...defaultOptions.queries,
        ...overrides?.queries,
      },
      mutations: {
        ...defaultOptions.mutations,
        ...overrides?.mutations,
      },
    },
  });
}

export default queryClient;
