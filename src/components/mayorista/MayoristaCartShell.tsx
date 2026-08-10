"use client";

import { CartProvider, useCartContext } from "@/components/carrito/CartProvider";
import CartDrawer from "@/components/carrito/CartDrawer";
import type { MayoristaTramo } from "@/types";

/**
 * Botón flotante de carrito para la página mayorista (que vive fuera del
 * layout de la tienda y por eso no tiene el header con el carrito).
 */
function CartFab() {
  const { itemCount, openDrawer, isLoaded } = useCartContext();
  if (!isLoaded || itemCount === 0) return null;

  return (
    <button
      type="button"
      onClick={openDrawer}
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#D4A853] px-5 py-3 text-[#1C2541] font-semibold shadow-lg shadow-black/30 transition-transform duration-150 ease-out active:scale-95 hover:bg-[#E0B968]"
      aria-label={`Ver carrito (${itemCount})`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
        className="w-5 h-5"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
        />
      </svg>
      <span>Carrito</span>
      <span className="flex items-center justify-center min-w-6 h-6 px-1.5 rounded-full bg-[#1C2541] text-[#D4A853] text-xs font-bold">
        {itemCount}
      </span>
    </button>
  );
}

/**
 * Envuelve el contenido de la lista mayorista con el carrito compartido de la
 * tienda (mismo localStorage → mismo checkout), más un drawer y un botón
 * flotante para llegar al checkout.
 */
export default function MayoristaCartShell({
  children,
  tramos = [],
  envioGratisDesde = 0,
}: {
  children: React.ReactNode;
  tramos?: MayoristaTramo[];
  envioGratisDesde?: number;
}) {
  return (
    <CartProvider tramos={tramos} envioGratisDesde={envioGratisDesde}>
      {children}
      <CartDrawer />
      <CartFab />
    </CartProvider>
  );
}
