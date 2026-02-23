import { useUser } from "@clerk/clerk-react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useEffect } from "react";
import { logger } from "@/lib/logger";

/**
 * Hook to sync authenticated Clerk user with Convex database.
 *
 * SECURITY: The upsertUser mutation now uses server-side identity verification.
 * We only pass optional profile data - the clerkId and email are extracted
 * from the server-side Clerk identity.
 */
export function useUserSync() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const upsertUser = useMutation(api.users.upsertUser);

  useEffect(() => {
    // Wait for both Clerk AND Convex auth to be ready
    // This prevents calling mutations before JWT token is available
    if (isLoaded && isSignedIn && user && isConvexAuthenticated) {
      // Defer non-critical user sync to avoid blocking main thread during initial render
      const syncUser = () => {
        // SECURITY: Only pass optional profile data
        // The clerkId and email are now extracted from server-side identity
        upsertUser({
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
        }).catch((error) => {
          // Log but don't throw - user sync failure shouldn't break the app
          logger.error("[useUserSync] Failed to sync user", error);
        });
      };

      // Use requestIdleCallback when available, otherwise setTimeout as fallback
      if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(syncUser);
        return () => window.cancelIdleCallback(id);
      } else {
        const id = window.setTimeout(syncUser, 0);
        return () => window.clearTimeout(id);
      }
    }
  }, [isLoaded, isSignedIn, user, isConvexAuthenticated, upsertUser]);
}
