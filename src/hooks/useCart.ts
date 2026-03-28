"use client";

import { useState, useEffect, useCallback } from "react";
import type { CartItem, Cart, VarianteSeleccion } from "@/types";

const CART_KEY = "sendero-cart";

function getStoredCart(): Cart {
  if (typeof window === "undefined") return { items: [], subtotal: 0 };
  try {
    const stored = localStorage.getItem(CART_KEY);
    if (stored) return JSON.parse(stored);
  } catch {
    // corrupted data
  }
  return { items: [], subtotal: 0 };
}

function saveCart(cart: Cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function calcularSubtotal(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + item.subtotal, 0);
}

// Genera una key única para cada combinación producto+opciones
function itemKey(producto_id: string, opciones: VarianteSeleccion[]): string {
  const opcionesKey = opciones
    .map((o) => `${o.grupo_id}:${o.opcion_id}`)
    .sort()
    .join("|");
  return `${producto_id}__${opcionesKey}`;
}

export function useCart() {
  const [cart, setCart] = useState<Cart>({ items: [], subtotal: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar carrito del localStorage
  useEffect(() => {
    setCart(getStoredCart());
    setIsLoaded(true);
  }, []);

  // Persistir cambios
  useEffect(() => {
    if (isLoaded) {
      saveCart(cart);
    }
  }, [cart, isLoaded]);

  const addItem = useCallback(
    (item: Omit<CartItem, "subtotal">) => {
      setCart((prev) => {
        const key = itemKey(item.producto_id, item.opciones);
        const existingIndex = prev.items.findIndex(
          (i) => itemKey(i.producto_id, i.opciones) === key
        );

        let newItems: CartItem[];
        if (existingIndex >= 0) {
          newItems = prev.items.map((i, idx) => {
            if (idx === existingIndex) {
              const newCantidad = i.cantidad + item.cantidad;
              return {
                ...i,
                cantidad: newCantidad,
                subtotal: i.precio_unitario * newCantidad,
              };
            }
            return i;
          });
        } else {
          const newItem: CartItem = {
            ...item,
            subtotal: item.precio_unitario * item.cantidad,
          };
          newItems = [...prev.items, newItem];
        }

        return { items: newItems, subtotal: calcularSubtotal(newItems) };
      });
    },
    []
  );

  const removeItem = useCallback(
    (producto_id: string, opciones: VarianteSeleccion[]) => {
      setCart((prev) => {
        const key = itemKey(producto_id, opciones);
        const newItems = prev.items.filter(
          (i) => itemKey(i.producto_id, i.opciones) !== key
        );
        return { items: newItems, subtotal: calcularSubtotal(newItems) };
      });
    },
    []
  );

  const updateQuantity = useCallback(
    (
      producto_id: string,
      opciones: VarianteSeleccion[],
      cantidad: number
    ) => {
      if (cantidad <= 0) {
        removeItem(producto_id, opciones);
        return;
      }
      setCart((prev) => {
        const key = itemKey(producto_id, opciones);
        const newItems = prev.items.map((i) => {
          if (itemKey(i.producto_id, i.opciones) === key) {
            return {
              ...i,
              cantidad,
              subtotal: i.precio_unitario * cantidad,
            };
          }
          return i;
        });
        return { items: newItems, subtotal: calcularSubtotal(newItems) };
      });
    },
    [removeItem]
  );

  const clearCart = useCallback(() => {
    setCart({ items: [], subtotal: 0 });
  }, []);

  const itemCount = cart.items.reduce((acc, i) => acc + i.cantidad, 0);

  return {
    cart,
    isLoaded,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    itemCount,
  };
}
