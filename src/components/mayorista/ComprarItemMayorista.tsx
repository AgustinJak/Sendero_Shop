"use client";

import { useState } from "react";
import { useCartContext } from "@/components/carrito/CartProvider";
import { cartItemFromMayoristaItem } from "@/lib/mayorista";
import type { MayoristaItem, MayoristaTramo } from "@/types";

/**
 * Botón "Comprar" para un ítem mayorista suelto, con selector de cantidad.
 * El descuento por cantidad se aplica solo en el carrito/checkout.
 */
export default function ComprarItemMayorista({
  item,
  tramos,
  listaCodigo,
}: {
  item: MayoristaItem;
  tramos: MayoristaTramo[];
  listaCodigo: string;
}) {
  const { addItem } = useCartContext();
  const [qty, setQty] = useState(1);

  // Sin PVP cargado no se puede comprar (la card ya muestra "a consultar").
  if (item.precio_pvp == null) return null;

  function comprar() {
    addItem(cartItemFromMayoristaItem(item, tramos, listaCodigo, qty));
    setQty(1);
  }

  return (
    <div className="mt-2.5 space-y-1.5">
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-[#8B85B2]/25 text-[#B8B3D1] hover:bg-[#8B85B2]/10 transition-colors"
          aria-label="Menos"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={qty}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
            setQty(Number.isNaN(n) || n < 1 ? 1 : n);
          }}
          className="w-10 h-7 text-center rounded-md bg-[#1C2541] border border-[#8B85B2]/25 text-[#E8E6F0] text-sm focus:outline-none focus:border-[#D4A853]/60"
          aria-label="Cantidad"
        />
        <button
          type="button"
          onClick={() => setQty((q) => q + 1)}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-[#8B85B2]/25 text-[#B8B3D1] hover:bg-[#8B85B2]/10 transition-colors"
          aria-label="Más"
        >
          +
        </button>
      </div>
      <button
        type="button"
        onClick={comprar}
        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#D4A853] hover:bg-[#E0B968] text-[#1C2541] text-sm font-semibold rounded-lg transition-[background-color,transform] duration-150 ease-out active:scale-[0.97]"
      >
        Comprar
      </button>
    </div>
  );
}
