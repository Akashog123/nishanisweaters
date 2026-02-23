/**
 * Cart Provider Component
 *
 * Main provider that manages cart state with optimistic updates,
 * server synchronization, and guest cart merging on login.
 */

import React, {
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useEffect,
  useState,
} from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { getSessionId, clearSessionId, hasSessionId } from "@/lib/session";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

import {
  CartItem,
  CartItemsContextType,
  CartActionsContextType,
  CartMetaContextType,
  CartContextType,
} from "./types";
import { optimisticReducer, initialOptimisticState } from "./cartReducer";
import {
  generateOperationId,
  RETRY_CONFIG,
  calculateRetryDelay,
  isTransientError,
  getUserFriendlyError,
} from "./cartUtils";
import {
  CartContext,
  CartItemsContext,
  CartActionsContext,
  CartMetaContext,
} from "./hooks";

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isSignedIn, isLoaded } = useUser();
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const [error, setError] = useState<string | null>(null);
  const [sessionId] = useState(() => getSessionId());
  const hasMerged = useRef(false);
  const lastServerSync = useRef<number>(0);

  // Optimistic state management
  const [optimisticState, dispatch] = useReducer(
    optimisticReducer,
    initialOptimisticState
  );

  // Get the appropriate identifier for cart queries
  const userId =
    isSignedIn && user && isConvexAuthenticated ? user.id : undefined;

  // Query cart based on auth state
  const cart = useQuery(
    api.cart.getCart,
    isLoaded
      ? userId
        ? {} // Authenticated - server gets userId from identity
        : { sessionId } // Guest - pass sessionId
      : "skip"
  );

  // Mutations
  const addToCartMutation = useMutation(api.cart.addToCart);
  const updateCartItemMutation = useMutation(api.cart.updateCartItem);
  const removeCartItemMutation = useMutation(api.cart.removeCartItem);
  const clearCartMutation = useMutation(api.cart.clearCart);
  const mergeGuestCartMutation = useMutation(api.cart.mergeGuestCart);

  // Sync optimistic state with server when cart updates
  useEffect(() => {
    if (cart?.items && cart.lastModified !== lastServerSync.current) {
      lastServerSync.current = cart.lastModified;

      const serverItems: CartItem[] = cart.items.map((item: any) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        image: item.image,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        isAvailable: item.isAvailable,
        unavailableReason: item.unavailableReason,
        _convexProductId: item.productId as Id<"products">,
        _variantSku: item.variantSku,
      }));

      dispatch({ type: "SYNC_WITH_SERVER", serverItems });
    }
  }, [cart?.items, cart?.lastModified]);

  // Merge guest cart when user logs in
  useEffect(() => {
    let cancelled = false;

    async function mergeCart() {
      // Only attempt merge if:
      // 1. Auth is fully loaded
      // 2. User is signed in
      // 3. Convex auth is ready
      // 4. There's a guest session ID in localStorage
      // 5. We haven't already merged in this session
      if (
        isLoaded &&
        isSignedIn &&
        user &&
        isConvexAuthenticated &&
        hasSessionId() &&
        !hasMerged.current
      ) {
        hasMerged.current = true;
        const guestSessionId = getSessionId();

        try {
          const result = await mergeGuestCartMutation({
            sessionId: guestSessionId,
          });
          if (cancelled) return;

          // Only show toast and clear session if items were actually merged
          // The mutation returns { merged: true, itemCount: n } when items were merged
          if (result?.merged && result.itemCount > 0) {
            toast.success(`${result.itemCount} item${result.itemCount > 1 ? 's' : ''} synced to your cart!`);
          }

          // Always clear the session ID after successful merge attempt
          clearSessionId();
        } catch (err) {
          if (cancelled) return;
          logger.error("Failed to merge guest cart", err);
        }
      }
    }
    mergeCart();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, isConvexAuthenticated, mergeGuestCartMutation]);

  // Reset merge flag when user logs out
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      hasMerged.current = false;
    }
  }, [isLoaded, isSignedIn]);

  // Retry wrapper for mutations
  const executeWithRetry = useCallback(
    async <T,>(
      operation: () => Promise<T>,
      operationId: string,
      onSuccess?: () => void,
      onError?: (error: unknown) => void
    ): Promise<void> => {
      let lastError: unknown;

      for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
        try {
          await operation();
          dispatch({ type: "CONFIRM_OPERATION", operationId });
          onSuccess?.();
          return;
        } catch (err) {
          lastError = err;

          if (isTransientError(err) && attempt < RETRY_CONFIG.maxRetries) {
            const delay = calculateRetryDelay(attempt);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          // Non-transient error or max retries reached
          break;
        }
      }

      // Rollback on failure
      dispatch({ type: "ROLLBACK_OPERATION", operationId });
      onError?.(lastError);
    },
    []
  );

  // ============================================
  // CART ACTIONS WITH OPTIMISTIC UPDATES
  // ============================================

  const addToCart = useCallback(
    (item: Omit<CartItem, "quantity"> & { quantity?: number }) => {
      setError(null);
      const operationId = generateOperationId();
      const quantity = item.quantity || 1;

      // Optimistic update - show change immediately
      const optimisticItem: CartItem = {
        ...item,
        quantity,
        _isOptimistic: true,
        _optimisticId: operationId,
      };
      dispatch({ type: "ADD_ITEM", item: optimisticItem, operationId });

      // Show immediate feedback
      toast.success(`${item.name} added to cart`);

      const productId = (item._convexProductId || item.productId) as Id<"products">;
      const variantSku = item._variantSku || `${item.size}-${item.color}`;

      // Execute mutation with retry
      executeWithRetry(
        () =>
          addToCartMutation({
            sessionId: userId ? undefined : sessionId,
            productId,
            variantSku,
            quantity,
          }),
        operationId,
        undefined,
        (err) => {
          const message = getUserFriendlyError(err);
          setError(message);
          toast.error(message);
        }
      );
    },
    [addToCartMutation, userId, sessionId, executeWithRetry]
  );

  const removeFromCart = useCallback(
    (productId: string, size: string, color: string) => {
      setError(null);
      const operationId = generateOperationId();

      // Find the item to get the correct variantSku
      const item = optimisticState.optimisticItems.find(
        (i) =>
          i.productId === productId && i.size === size && i.color === color
      );

      if (!item) return;

      // Optimistic update
      dispatch({ type: "REMOVE_ITEM", productId, size, color, operationId });
      toast.success("Item removed from cart");

      const convexProductId = (item._convexProductId || productId) as Id<"products">;
      const variantSku = item._variantSku || `${size}-${color}`;

      // Execute mutation with retry
      executeWithRetry(
        () =>
          removeCartItemMutation({
            sessionId: userId ? undefined : sessionId,
            productId: convexProductId,
            variantSku,
          }),
        operationId,
        undefined,
        (err) => {
          const message = getUserFriendlyError(err);
          setError(message);
          toast.error(message);
        }
      );
    },
    [
      removeCartItemMutation,
      userId,
      sessionId,
      optimisticState.optimisticItems,
      executeWithRetry,
    ]
  );

  const updateQuantity = useCallback(
    (productId: string, size: string, color: string, quantity: number) => {
      setError(null);
      const operationId = generateOperationId();

      // Find the item to get the correct variantSku
      const item = optimisticState.optimisticItems.find(
        (i) =>
          i.productId === productId && i.size === size && i.color === color
      );

      if (!item) return;

      // Handle removal if quantity is 0 or less
      if (quantity <= 0) {
        removeFromCart(productId, size, color);
        return;
      }

      // Optimistic update
      dispatch({
        type: "UPDATE_QUANTITY",
        productId,
        size,
        color,
        quantity,
        operationId,
      });

      const convexProductId = (item._convexProductId || productId) as Id<"products">;
      const variantSku = item._variantSku || `${size}-${color}`;

      // Execute mutation with retry
      executeWithRetry(
        () =>
          updateCartItemMutation({
            sessionId: userId ? undefined : sessionId,
            productId: convexProductId,
            variantSku,
            quantity,
          }),
        operationId,
        undefined,
        (err) => {
          const message = getUserFriendlyError(err);
          setError(message);

          if (message.includes("stock")) {
            toast.error("Cannot add more - insufficient stock");
          } else {
            toast.error(message);
          }
        }
      );
    },
    [
      updateCartItemMutation,
      userId,
      sessionId,
      optimisticState.optimisticItems,
      removeFromCart,
      executeWithRetry,
    ]
  );

  const clearCart = useCallback(() => {
    setError(null);
    const operationId = generateOperationId();

    // Optimistic update
    dispatch({ type: "CLEAR_CART", operationId });
    toast.success("Cart cleared");

    // Execute mutation with retry
    executeWithRetry(
      () =>
        clearCartMutation({
          sessionId: userId ? undefined : sessionId,
        }),
      operationId,
      undefined,
      (err) => {
        const message = getUserFriendlyError(err);
        setError(message);
        toast.error(message);
      }
    );
  }, [clearCartMutation, userId, sessionId, executeWithRetry]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const items = optimisticState.optimisticItems;

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + (item.isAvailable === false ? 0 : item.quantity), 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + (item.isAvailable === false ? 0 : item.price * item.quantity), 0),
    [items]
  );

  const getSubtotal = useCallback(() => subtotal, [subtotal]);
  const getTotalItems = useCallback(() => totalItems, [totalItems]);

  const isLoading = cart === undefined && optimisticState.optimisticItems.length === 0;
  const hasPendingOperations = optimisticState.pendingOperations.size > 0;

  // Extract promo data from the server cart
  const promoDiscount = cart?.promoDiscount ?? 0;
  const appliedPromoCode = cart?.appliedPromoCode ?? null;

  // ============================================
  // CONTEXT VALUES
  // ============================================

  const itemsContextValue: CartItemsContextType = useMemo(
    () => ({
      items,
      totalItems,
      subtotal,
      isLoading: isLoading || hasPendingOperations,
      error,
      promoDiscount,
      appliedPromoCode,
    }),
    [items, totalItems, subtotal, isLoading, hasPendingOperations, error, promoDiscount, appliedPromoCode]
  );

  const actionsContextValue: CartActionsContextType = useMemo(
    () => ({
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    }),
    [addToCart, removeFromCart, updateQuantity, clearCart]
  );

  const metaContextValue: CartMetaContextType = useMemo(
    () => ({
      getSubtotal,
      getTotalItems,
    }),
    [getSubtotal, getTotalItems]
  );

  const legacyContextValue: CartContextType = useMemo(
    () => ({
      ...itemsContextValue,
      ...actionsContextValue,
      ...metaContextValue,
    }),
    [itemsContextValue, actionsContextValue, metaContextValue]
  );

  return (
    <CartContext.Provider value={legacyContextValue}>
      <CartItemsContext.Provider value={itemsContextValue}>
        <CartActionsContext.Provider value={actionsContextValue}>
          <CartMetaContext.Provider value={metaContextValue}>
            {children}
          </CartMetaContext.Provider>
        </CartActionsContext.Provider>
      </CartItemsContext.Provider>
    </CartContext.Provider>
  );
};
