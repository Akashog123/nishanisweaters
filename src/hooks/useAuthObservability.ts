/**
 * Authentication Observability Hook
 *
 * Sets user segment context for performance tracking based on authentication state.
 * This enables segment-specific SLI/SLO thresholds for performance monitoring.
 *
 * PERFORMANCE: Call this hook once in App.tsx or main layout to set
 * the user segment for all subsequent performance measurements.
 */

import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { setUserSegment, type UserSegment } from "@/lib/observability";

/**
 * Sets user segment for observability based on authentication state.
 *
 * Segments:
 * - 'anonymous': Not signed in
 * - 'retail': Authenticated customer
 *
 * @example
 * ```tsx
 * // In App.tsx or main layout
 * function App() {
 *   useAuthObservability();
 *   return <AppRoutes />;
 * }
 * ```
 */
export function useAuthObservability(): void {
  const { isSignedIn, isLoaded } = useUser();

  // Only query for user when signed in
  const dbUser = useQuery(
    api.users.getCurrentUser,
    isSignedIn ? {} : "skip"
  );

  useEffect(() => {
    if (!isLoaded) {
      // Auth still loading, don't set segment yet
      return;
    }

    let segment: UserSegment = "anonymous";

    if (isSignedIn && dbUser) {
      // Authenticated users are retail customers
      segment = "retail";
    } else if (isSignedIn) {
      // User is signed in but data hasn't loaded yet
      // Default to retail
      segment = "retail";
    }

    setUserSegment(segment);
  }, [isLoaded, isSignedIn, dbUser]);
}

export default useAuthObservability;
