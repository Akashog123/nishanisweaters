import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";

/**
 * Shared hook for fetching the current user from the database.
 *
 * Wraps useQuery(api.users.getCurrentUser) with proper skip logic
 * so every consumer doesn't need to repeat the isSignedIn check.
 *
 * Convex deduplicates identical reactive queries, so multiple components
 * using this hook share a single WebSocket subscription.
 */
export function useCurrentUser() {
  const { isSignedIn } = useUser();

  const user = useQuery(
    api.users.getCurrentUser,
    isSignedIn ? {} : "skip"
  );

  return {
    user,
    isAdmin: user?.role === "admin",
  };
}
