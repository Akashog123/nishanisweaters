/**
 * Cart Context Module
 *
 * This module provides cart functionality with optimistic updates,
 * split contexts for performance, and backwards compatibility.
 *
 * ## Usage
 *
 * ```tsx
 * // For full cart access (legacy, convenient but less performant)
 * import { useCart } from "@/context/cart";
 *
 * // For better performance, use specific hooks:
 * import { useCartItems, useCartActions, useCartMeta } from "@/context/cart";
 *
 * // In a component that displays items:
 * const { items, totalItems, subtotal } = useCartItems();
 *
 * // In a component that only adds items (won't re-render on cart changes):
 * const { addToCart } = useCartActions();
 * ```
 *
 * ## Architecture
 *
 * The cart context is split into three separate contexts:
 * 1. CartItemsContext - Read-only cart state (items, totals)
 * 2. CartActionsContext - Cart mutations (add, remove, update)
 * 3. CartMetaContext - Computed helpers
 *
 * This split prevents unnecessary re-renders. For example, an "Add to Cart"
 * button only needs actions, not items, so it won't re-render when items change.
 */

// Re-export types
export type {
  CartItem,
  CartItemsContextType,
  CartActionsContextType,
  CartMetaContextType,
  CartContextType,
  OptimisticState,
  OptimisticAction,
  OptimisticOperation,
} from "./types";

// Re-export hooks
export {
  useCart,
  useCartItems,
  useCartActions,
  useCartMeta,
} from "./hooks";

// Re-export provider
export { CartProvider } from "./CartProvider";

// Re-export utilities (for testing)
export {
  generateOperationId,
  RETRY_CONFIG,
  calculateRetryDelay,
  isTransientError,
  getUserFriendlyError,
} from "./cartUtils";

// Re-export UI context for cart drawer
export { CartUIProvider, useCartUI } from "./CartUIContext";

// Re-export reducer (for testing)
export { optimisticReducer, initialOptimisticState } from "./cartReducer";
