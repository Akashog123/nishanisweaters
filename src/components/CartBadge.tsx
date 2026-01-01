/**
 * CartBadge Component
 *
 * Memoized cart badge that only re-renders when cart count changes.
 *
 * PERFORMANCE: By extracting this into a separate component, we prevent
 * the entire Header from re-rendering when the cart changes. The Header
 * uses useCartItems() which would cause a full re-render on every cart
 * update without this optimization.
 */

import { memo } from "react";
import { useCartItems } from "@/context/cart/hooks";

/**
 * Displays the cart item count badge.
 *
 * Uses opacity transitions instead of conditional rendering to prevent CLS.
 * The badge is always in the DOM but visually hidden when count is 0.
 */
export const CartBadge = memo(function CartBadge() {
  const { totalItems } = useCartItems();

  return (
    <span
      className={`absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium transition-opacity duration-150 ${
        totalItems > 0 ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={totalItems === 0}
    >
      {totalItems > 0 ? totalItems : 0}
    </span>
  );
});

export default CartBadge;
