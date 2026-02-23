/**
 * Cart Context Types
 *
 * All type definitions for the cart system, including CartItem,
 * optimistic update types, and context interfaces.
 */

import { Id } from "../../../convex/_generated/dataModel";

// ============================================
// CART ITEM TYPES
// ============================================

/**
 * Cart item interface - maintains backwards compatibility with existing code
 * Note: price is now a number instead of string for proper calculations
 */
export interface CartItem {
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
  // Availability status
  isAvailable?: boolean;
  unavailableReason?: string;
  // Internal fields for Convex integration
  _convexProductId?: Id<"products">;
  _variantSku?: string;
  // Optimistic update tracking
  _isOptimistic?: boolean;
  _optimisticId?: string;
}

// ============================================
// OPTIMISTIC UPDATE TYPES
// ============================================

/**
 * Optimistic operation for tracking pending changes
 */
export interface OptimisticOperation {
  id: string;
  type: "add" | "update" | "remove" | "clear";
  item?: CartItem;
  previousItems?: CartItem[];
  timestamp: number;
}

/**
 * State for optimistic updates reducer
 */
export interface OptimisticState {
  optimisticItems: CartItem[];
  pendingOperations: Map<string, OptimisticOperation>;
}

/**
 * Actions for the optimistic reducer
 */
export type OptimisticAction =
  | { type: "ADD_ITEM"; item: CartItem; operationId: string }
  | {
      type: "UPDATE_QUANTITY";
      productId: string;
      size: string;
      color: string;
      quantity: number;
      operationId: string;
    }
  | {
      type: "REMOVE_ITEM";
      productId: string;
      size: string;
      color: string;
      operationId: string;
    }
  | { type: "CLEAR_CART"; operationId: string }
  | { type: "CONFIRM_OPERATION"; operationId: string }
  | { type: "ROLLBACK_OPERATION"; operationId: string }
  | { type: "SYNC_WITH_SERVER"; serverItems: CartItem[] };

// ============================================
// CONTEXT TYPE DEFINITIONS
// ============================================

/**
 * Context for cart items (read-only, frequently updated)
 * Separating this allows components that only read cart items
 * to avoid re-renders from action changes
 */
export interface CartItemsContextType {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  isLoading: boolean;
  error: string | null;
  promoDiscount: number;
  appliedPromoCode: string | null;
}

/**
 * Context for cart actions (stable references, rarely changes)
 * Components that only trigger actions don't need to re-render
 * when cart items change
 */
export interface CartActionsContextType {
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeFromCart: (productId: string, size: string, color: string) => void;
  updateQuantity: (
    productId: string,
    size: string,
    color: string,
    quantity: number
  ) => void;
  clearCart: () => void;
}

/**
 * Context for computed helpers (stable references)
 */
export interface CartMetaContextType {
  getSubtotal: () => number;
  getTotalItems: () => number;
}

/**
 * Legacy combined context for backwards compatibility
 * New code should use the specific context hooks
 */
export interface CartContextType
  extends CartItemsContextType,
    CartActionsContextType,
    CartMetaContextType {}
