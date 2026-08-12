"use client";

import { useCartContext } from "./CartProvider";

export default function CartBadge() {
  const { itemCount, openDrawer } = useCartContext();

  return (
    <button
      onClick={openDrawer}
      className="relative text-lavanda-light hover:text-niebla transition-colors"
      aria-label={`Carrito (${itemCount} items)`}
    >
      <div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
          />
        </svg>
      </div>

      {/* El `key` remonta el badge cuando cambia la cantidad y la animación se
          reproduce sola: sin estado ni efecto. Antes un ref desactualizado
          hacía que también rebotara al quitar unidades. */}
      {itemCount > 0 && (
        <span
          key={itemCount}
          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-ambar text-navy-deep text-[10px] font-bold rounded-full flex items-center justify-center animate-pop"
        >
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      )}
    </button>
  );
}
