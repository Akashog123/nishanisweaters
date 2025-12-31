/**
 * Cart Context Hooks
 *
 * Split hooks for better render performance. Components can import
 * only the hook they need to minimize re-renders.
 */

import { createContext, useContext } from "react";
import {
  CartItemsContextType,
  CartActionsContextType,
  CartMetaContextType,
  CartContextType,
} from "./types";

// ============================================
// CONTEXT CREATION
// ============================================

export const CartItemsContext = createContext<CartItemsContextType | undefined>(
  undefined
);
export const CartActionsContext = createContext<CartActionsContextType | undefined>(
  undefined
);
export const CartMetaContext = createContext<CartMetaContextType | undefined>(
  undefined
);
// Legacy context for backwards compatibility
export const CartContext = createContext<CartContextType | undefined>(undefined);

// ============================================
// HOOKS
// ============================================

/**
 * Legacy hook - provides all cart functionality
 * Use specific hooks below for better performance
 *
 * When to use: Quick migration from old code, or when you need
 * all cart functionality in a single component
 */
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

/**
 * Hook for cart items - use when you only need to display items
 * Re-renders when items change
 *
 * Best for: Cart display, item lists, totals display
 */
export const useCartItems = () => {
  const context = useContext(CartItemsContext);
  if (context === undefined) {
    throw new Error("useCartItems must be used within a CartProvider");
  }
  return context;
};

/**
 * Hook for cart actions - use when you only need to modify the cart
 * Stable references, rarely causes re-renders
 *
 * Best for: Add to cart buttons, quantity controls, remove buttons
 */
export const useCartActions = () => {
  const context = useContext(CartActionsContext);
  if (context === undefined) {
    throw new Error("useCartActions must be used within a CartProvider");
  }
  return context;
};

/**
 * Hook for cart meta helpers
 *
 * Best for: Components that need computed values but not raw items
 */
export const useCartMeta = () => {
  const context = useContext(CartMetaContext);
  if (context === undefined) {
    throw new Error("useCartMeta must be used within a CartProvider");
  }
  return context;
};
