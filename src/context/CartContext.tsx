/**
 * Cart Context
 *
 * This file now re-exports from the modular cart context for backwards compatibility.
 * All cart functionality has been split into focused modules:
 *
 * - types.ts: Type definitions
 * - cartReducer.ts: Optimistic update reducer
 * - cartUtils.ts: Utility functions
 * - hooks.ts: Context hooks
 * - CartProvider.tsx: Main provider component
 *
 * @see src/context/cart/index.ts for the modular implementation
 */

// Re-export everything from the modular cart context
export {
  // Types
  type CartItem,
  type CartItemsContextType,
  type CartActionsContextType,
  type CartMetaContextType,
  type CartContextType,
  type OptimisticState,
  type OptimisticAction,
  type OptimisticOperation,
  // Provider
  CartProvider,
  // Hooks
  useCart,
  useCartItems,
  useCartActions,
  useCartMeta,
  // Utilities (for testing)
  generateOperationId,
  RETRY_CONFIG,
  calculateRetryDelay,
  isTransientError,
  getUserFriendlyError,
  // Reducer (for testing)
  optimisticReducer,
  initialOptimisticState,
} from "./cart";
