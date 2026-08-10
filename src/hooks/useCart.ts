"use client";

import { useState, useEffect, useCallback } from "react";
import type { CartItem, Cart, VarianteSeleccion, MayoristaTramo } from "@/types";
import { precioUnitario } from "@/lib/mayorista";

const CART_KEY = "sendero-cart";

type PrecioFields = Pick<
  CartItem,
  "precio_base" | "precio_unitario" | "precio_lista" | "mayorista"
>;

/** Precio de referencia (sin descuento) de una línea. */
function precioLista(item: PrecioFields): number {
  return item.precio_lista ?? item.precio_unitario;
}

/**
 * Precio unitario efectivo de una línea, con el descuento por cantidad que le
 * corresponda a *esa* línea (cada modelo/variante cuenta por separado).
 *
 * Aplica tanto a productos del catálogo como a ítems mayoristas sueltos. Los
 * kits quedan afuera: su precio ya viene armado e incluye su descuento.
 */
function unitarioEfectivo(
  item: PrecioFields,
  cantidad: number,
  tramosGlobales: MayoristaTramo[]
): number {
  if (item.mayorista?.esKit) return item.precio_unitario;

  const tramos = item.mayorista?.tramos?.length
    ? item.mayorista.tramos
    : tramosGlobales;
  if (!tramos.length) return precioLista(item);

  return precioUnitario(precioLista(item), tramos, cantidad).precio;
}

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

export function useCart(tramos: MayoristaTramo[] = []) {
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
              const unit = unitarioEfectivo(i, newCantidad, tramos);
              return {
                ...i,
                cantidad: newCantidad,
                precio_lista: precioLista(i),
                precio_unitario: unit,
                subtotal: unit * newCantidad,
              };
            }
            return i;
          });
        } else {
          // `precio_lista` se fija al agregar: es la referencia sin descuento,
          // así el tramo nunca se aplica sobre un precio ya descontado.
          const base = { ...item, precio_lista: precioLista(item) };
          const unit = unitarioEfectivo(base, base.cantidad, tramos);
          const newItem: CartItem = {
            ...base,
            precio_unitario: unit,
            subtotal: unit * base.cantidad,
          };
          newItems = [...prev.items, newItem];
        }

        return { items: newItems, subtotal: calcularSubtotal(newItems) };
      });
    },
    [tramos]
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
            const unit = unitarioEfectivo(i, cantidad, tramos);
            return {
              ...i,
              cantidad,
              precio_lista: precioLista(i),
              precio_unitario: unit,
              subtotal: unit * cantidad,
            };
          }
          return i;
        });
        return { items: newItems, subtotal: calcularSubtotal(newItems) };
      });
    },
    [removeItem, tramos]
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
