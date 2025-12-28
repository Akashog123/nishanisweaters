import React, { createContext, useContext, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { getSessionId, clearSessionId, hasSessionId } from "@/lib/session";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

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
  // Internal fields for Convex integration
  _convexProductId?: Id<"products">;
  _variantSku?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeFromCart: (productId: string, size: string, color: string) => void;
  updateQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  // New fields for Convex integration
  isLoading: boolean;
  error: string | null;
  // Helper methods for Cart page compatibility
  getSubtotal: () => number;
  getTotalItems: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isSignedIn, isLoaded } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => getSessionId());
  const hasMerged = useRef(false);
  const [pendingOperations, setPendingOperations] = useState(0);

  // Get the appropriate identifier for cart queries
  const userId = isSignedIn && user ? user.id : undefined;

  // Query cart based on auth state
  const cart = useQuery(
    api.cart.getCart,
    isLoaded
      ? userId
        ? { userId }
        : { sessionId }
      : "skip"
  );

  // Mutations
  const addToCartMutation = useMutation(api.cart.addToCart);
  const updateCartItemMutation = useMutation(api.cart.updateCartItem);
  const removeCartItemMutation = useMutation(api.cart.removeCartItem);
  const clearCartMutation = useMutation(api.cart.clearCart);
  const mergeGuestCartMutation = useMutation(api.cart.mergeGuestCart);

  // Merge guest cart when user logs in
  useEffect(() => {
    async function mergeCart() {
      if (
        isLoaded &&
        isSignedIn &&
        user &&
        hasSessionId() &&
        !hasMerged.current
      ) {
        hasMerged.current = true;
        try {
          await mergeGuestCartMutation({
            userId: user.id,
            sessionId: getSessionId(),
          });
          // Clear session ID after successful merge
          clearSessionId();
          toast.success("Your cart has been synced!");
        } catch (err) {
          logger.error("Failed to merge guest cart", err);
          // Don't block the user, just log the error
        }
      }
    }
    mergeCart();
  }, [isLoaded, isSignedIn, user, mergeGuestCartMutation]);

  // Reset merge flag when user logs out
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      hasMerged.current = false;
    }
  }, [isLoaded, isSignedIn]);

  // Transform Convex cart items to CartItem format for backwards compatibility
  const items: CartItem[] = useMemo(() => {
    if (!cart?.items) return [];
    return cart.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      price: item.price,
      image: item.image,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      _convexProductId: item.productId as Id<"products">,
      _variantSku: item.variantSku,
    }));
  }, [cart?.items]);

  /**
   * Add item to cart
   * Supports both legacy string productId and Convex Id
   */
  const addToCart = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setError(null);
      setPendingOperations((prev) => prev + 1);

      const productId = (item._convexProductId || item.productId) as Id<"products">;
      const variantSku = item._variantSku || `${item.size}-${item.color}`;
      const quantity = item.quantity || 1;

      addToCartMutation({
        userId: userId,
        sessionId: userId ? undefined : sessionId,
        productId,
        variantSku,
        quantity,
      })
        .then(() => {
          toast.success(`${item.name} added to cart`);
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Failed to add item to cart";
          setError(message);

          // Show user-friendly error messages
          if (message.includes("Insufficient stock")) {
            toast.error("Sorry, this item is out of stock");
          } else if (message.includes("Product not found")) {
            toast.error("This product is no longer available");
          } else if (message.includes("Variant not found")) {
            toast.error("This size/color combination is not available");
          } else {
            toast.error(message);
          }
        })
        .finally(() => {
          setPendingOperations((prev) => prev - 1);
        });
    },
    [addToCartMutation, userId, sessionId]
  );

  /**
   * Remove item from cart
   */
  const removeFromCart = useCallback(
    (productId: string, size: string, color: string) => {
      setError(null);
      setPendingOperations((prev) => prev + 1);

      // Find the item to get the correct variantSku
      const item = items.find(
        (i) =>
          i.productId === productId && i.size === size && i.color === color
      );

      if (!item) {
        setPendingOperations((prev) => prev - 1);
        return;
      }

      const convexProductId = (item._convexProductId || productId) as Id<"products">;
      const variantSku = item._variantSku || `${size}-${color}`;

      removeCartItemMutation({
        userId: userId,
        sessionId: userId ? undefined : sessionId,
        productId: convexProductId,
        variantSku,
      })
        .then(() => {
          toast.success("Item removed from cart");
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Failed to remove item";
          setError(message);
          toast.error(message);
        })
        .finally(() => {
          setPendingOperations((prev) => prev - 1);
        });
    },
    [removeCartItemMutation, userId, sessionId, items]
  );

  /**
   * Update item quantity
   */
  const updateQuantity = useCallback(
    (productId: string, size: string, color: string, quantity: number) => {
      setError(null);
      setPendingOperations((prev) => prev + 1);

      // Find the item to get the correct variantSku
      const item = items.find(
        (i) =>
          i.productId === productId && i.size === size && i.color === color
      );

      if (!item) {
        setPendingOperations((prev) => prev - 1);
        return;
      }

      const convexProductId = (item._convexProductId || productId) as Id<"products">;
      const variantSku = item._variantSku || `${size}-${color}`;

      updateCartItemMutation({
        userId: userId,
        sessionId: userId ? undefined : sessionId,
        productId: convexProductId,
        variantSku,
        quantity,
      })
        .catch((err) => {
          const message = err instanceof Error ? err.message : "Failed to update quantity";
          setError(message);

          if (message.includes("Insufficient stock")) {
            toast.error("Cannot add more - insufficient stock");
          } else {
            toast.error(message);
          }
        })
        .finally(() => {
          setPendingOperations((prev) => prev - 1);
        });
    },
    [updateCartItemMutation, userId, sessionId, items]
  );

  /**
   * Clear the entire cart
   */
  const clearCart = useCallback(() => {
    setError(null);
    setPendingOperations((prev) => prev + 1);

    clearCartMutation({
      userId: userId,
      sessionId: userId ? undefined : sessionId,
    })
      .then(() => {
        toast.success("Cart cleared");
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : "Failed to clear cart";
        setError(message);
        toast.error(message);
      })
      .finally(() => {
        setPendingOperations((prev) => prev - 1);
      });
  }, [clearCartMutation, userId, sessionId]);

  // Calculate totals
  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  // Helper methods for backwards compatibility with Cart page
  const getSubtotal = useCallback(() => subtotal, [subtotal]);
  const getTotalItems = useCallback(() => totalItems, [totalItems]);

  // Determine loading state
  const isLoading = cart === undefined || pendingOperations > 0;

  // Memoize context value to prevent unnecessary re-renders
  const value: CartContextType = useMemo(
    () => ({
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      subtotal,
      isLoading,
      error,
      getSubtotal,
      getTotalItems,
    }),
    [
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      totalItems,
      subtotal,
      isLoading,
      error,
      getSubtotal,
      getTotalItems,
    ]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
