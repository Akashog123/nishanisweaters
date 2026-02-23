/**
 * Cart UI Context
 *
 * Provides global state for cart drawer visibility.
 * Allows components anywhere in the app to open/close the cart sidebar.
 */

import React, { createContext, useContext, useState, useCallback } from "react";

interface CartUIContextType {
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

const CartUIContext = createContext<CartUIContextType | undefined>(undefined);

export const CartUIProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isCartOpen, setIsCartOpen] = useState(false);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), []);

  return (
    <CartUIContext.Provider value={{ isCartOpen, setIsCartOpen, openCart, closeCart, toggleCart }}>
      {children}
    </CartUIContext.Provider>
  );
};

export const useCartUI = (): CartUIContextType => {
  const context = useContext(CartUIContext);
  if (!context) {
    throw new Error("useCartUI must be used within a CartUIProvider");
  }
  return context;
};
