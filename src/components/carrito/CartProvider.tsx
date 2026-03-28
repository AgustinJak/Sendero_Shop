"use client";

import { createContext, useContext, useState } from "react";
import { useCart } from "@/hooks/useCart";
import type { CartItem, Cart, VarianteSeleccion } from "@/types";

interface CartContextType {
  cart: Cart;
  isLoaded: boolean;
  addItem: (item: Omit<CartItem, "subtotal">) => void;
  removeItem: (producto_id: string, opciones: VarianteSeleccion[]) => void;
  updateQuantity: (producto_id: string, opciones: VarianteSeleccion[], cantidad: number) => void;
  clearCart: () => void;
  itemCount: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const cartHook = useCart();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  // Wrap addItem to also open drawer
  const addItem = (item: Omit<CartItem, "subtotal">) => {
    cartHook.addItem(item);
    setIsDrawerOpen(true);
  };

  return (
    <CartContext.Provider
      value={{
        ...cartHook,
        addItem,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartContext must be used within CartProvider");
  return ctx;
}
