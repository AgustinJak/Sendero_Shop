"use client";

/**
 * Selector de cantidad de la página de producto.
 *
 * Existe para que se pueda pedir volumen sin clickear "Agregar" N veces, que
 * es lo que habilita los descuentos por cantidad.
 */
export default function QuantitySelector({
  cantidad,
  onChange,
  max = 999,
}: {
  cantidad: number;
  onChange: (n: number) => void;
  max?: number;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(1, n));

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-texto-3">Cantidad</span>
      <div className="flex items-center rounded-lg border border-linea bg-navy-deep">
        <button
          type="button"
          onClick={() => onChange(clamp(cantidad - 1))}
          disabled={cantidad <= 1}
          className="w-10 h-10 flex items-center justify-center text-lg text-lavanda-light transition-colors hover:bg-lavanda/10 disabled:opacity-40 disabled:hover:bg-transparent rounded-l-lg"
          aria-label="Quitar una unidad"
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={cantidad}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
            onChange(Number.isNaN(n) ? 1 : clamp(n));
          }}
          className="w-12 h-10 bg-transparent text-center text-sm font-semibold text-niebla focus:outline-none"
          aria-label="Cantidad"
        />
        <button
          type="button"
          onClick={() => onChange(clamp(cantidad + 1))}
          disabled={cantidad >= max}
          className="w-10 h-10 flex items-center justify-center text-lg text-lavanda-light transition-colors hover:bg-lavanda/10 disabled:opacity-40 disabled:hover:bg-transparent rounded-r-lg"
          aria-label="Agregar una unidad"
        >
          +
        </button>
      </div>
    </div>
  );
}
