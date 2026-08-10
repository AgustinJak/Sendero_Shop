"use client";

import { useCartContext } from "@/components/carrito/CartProvider";
import { cartItemFromKit } from "@/lib/mayorista";
import type { MayoristaKit } from "@/types";
import type { KitCalculo } from "@/lib/mayorista";

/**
 * Botón "Comprar kit": agrega el combo entero al carrito con las unidades de
 * cada modelo ya cargadas y el precio del kit (incluye el descuento extra).
 */
export default function ComprarKitMayorista({
  kit,
  calc,
  listaCodigo,
}: {
  kit: MayoristaKit;
  calc: KitCalculo;
  listaCodigo: string;
}) {
  const { addItem } = useCartContext();

  // Kit incompleto (algún ítem sin PVP) → no se puede cotizar el total.
  if (!calc.completo || calc.total <= 0) return null;

  return (
    <button
      type="button"
      onClick={() => addItem(cartItemFromKit(kit, calc, listaCodigo, 1))}
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#D4A853] hover:bg-[#E0B968] text-[#1C2541] text-sm font-semibold rounded-lg transition-[background-color,transform] duration-150 ease-out active:scale-[0.97]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.8}
        stroke="currentColor"
        className="w-4 h-4"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z"
        />
      </svg>
      Comprar kit
    </button>
  );
}
