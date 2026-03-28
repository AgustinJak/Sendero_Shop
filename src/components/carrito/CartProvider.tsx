"use client";

import { createContext, useContext, useState } from "react";
import { useCart } from "@/hooks/useCart";
import { trackAddToCart, trackRemoveFromCart } from "@/lib/analytics";
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

  // Wrap addItem to also open drawer + track
  const addItem = (item: Omit<CartItem, "subtotal">) => {
    cartHook.addItem(item);
    trackAddToCart({
      id: item.producto_id,
      name: item.nombre,
      price: item.precio_unitario,
      quantity: item.cantidad,
    });
    setIsDrawerOpen(true);
  };

  // Wrap removeItem to track
  const removeItem = (producto_id: string, opciones: VarianteSeleccion[]) => {
    const existing = cartHook.cart.items.find(
      (i) => i.producto_id === producto_id &&
        JSON.stringify(i.opciones) === JSON.stringify(opciones)
    );
    if (existing) {
      trackRemoveFromCart({
        id: existing.producto_id,
        name: existing.nombre,
        price: existing.precio_unitario,
        quantity: existing.cantidad,
      });
    }
    cartHook.removeItem(producto_id, opciones);
  };

  return (
    <CartContext.Provider
      value={{
        ...cartHook,
        addItem,
        removeItem,
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
