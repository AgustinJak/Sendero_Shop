"use client";


/**
 * Estrellas con relleno proporcional al promedio (0–5).
 * Reutilizable: catálogo, detalle, etc.
 */
export function StarRating({
  rating,
  count,
  className = "",
}: {
  rating: number;
  count: number;
  className?: string;
}) {
  if (count <= 0) return null;
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100));

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative inline-flex leading-none" aria-hidden="true">
        <span className="text-lavanda/25 tracking-tight">★★★★★</span>
        <span
          className="absolute inset-0 overflow-hidden text-ambar tracking-tight whitespace-nowrap"
          style={{ width: `${pct}%` }}
        >
          ★★★★★
        </span>
      </div>
      <span className="text-sm text-lavanda-light">
        <span className="font-semibold text-niebla">{rating.toFixed(1)}</span>{" "}
        ({count} {count === 1 ? "reseña" : "reseñas"})
      </span>
    </div>
  );
}

/**
 * Señales de confianza cerca del botón de compra: hoy, los medios de pago.
 *
 * El badge de MercadoLíder Gold se sacó el 2026-08-17: mandaba al comprador a
 * Mercado Libre justo al lado del botón de comprar acá.
 *
 * Sin caja a propósito: es información pasiva. La caja se reserva para el
 * bloque de envío, que sí tiene input y botón. Antes las dos usaban el mismo
 * contenedor y parecían lo mismo.
 *
 * Lo de envío tampoco va acá: lo cubre `EnvioProducto`, justo abajo.
 */
export function TrustBadges() {
  return (
    <div className="space-y-3">
      {/* Medios de pago */}
      <div className="flex items-start gap-2.5 text-sm text-lavanda-light">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 text-lavanda shrink-0"
          aria-hidden="true"
        >
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </svg>
        <div className="flex flex-wrap gap-1.5">
          {["MercadoPago", "Transferencia", "Efectivo"].map((m) => (
            <span
              key={m}
              className="px-2 py-0.5 rounded-md bg-lavanda/10 text-xs text-lavanda-light"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
