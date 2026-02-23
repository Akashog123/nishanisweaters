/**
 * WishlistBadge Component
 *
 * Memoized wishlist badge that only re-renders when wishlist count changes.
 *
 * PERFORMANCE: By extracting this into a separate component, we prevent
 * the entire Header from re-rendering when the wishlist changes.
 */

import { memo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";

/**
 * Displays the wishlist item count badge.
 *
 * Uses opacity transitions instead of conditional rendering to prevent CLS.
 * The badge is always in the DOM but visually hidden when count is 0.
 */
export const WishlistBadge = memo(function WishlistBadge() {
  const { isSignedIn } = useUser();

  const wishlistCount = useQuery(
    api.wishlist.getWishlistCount,
    isSignedIn ? {} : "skip"
  );

  // Handle loading state - don't show badge while loading
  if (wishlistCount === undefined) {
    return null;
  }

  return (
    <span
      className={`absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium transition-opacity duration-150 ${
        wishlistCount > 0 ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={wishlistCount === 0}
    >
      {wishlistCount > 0 ? wishlistCount : 0}
    </span>
  );
});

export default WishlistBadge;
