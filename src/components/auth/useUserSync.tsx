import { useUser } from "@clerk/clerk-react";
import { useMutation } from "convex/react";
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
  const upsertUser = useMutation(api.users.upsertUser);

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // SECURITY: Only pass optional profile data
      // The clerkId and email are now extracted from server-side identity
      upsertUser({
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
      }).catch((error) => {
        // Log but don't throw - user sync failure shouldn't break the app
        logger.error("[useUserSync] Failed to sync user", error);
      });
    }
  }, [isLoaded, isSignedIn, user, upsertUser]);
}
