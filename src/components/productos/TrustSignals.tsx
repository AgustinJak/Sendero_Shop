"use client";

const ML_URL = "https://www.mercadolibre.com.ar/pagina/sendero3d";

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
 * Señales de confianza cerca del botón de compra: quién vende y cómo se paga.
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
      {/* MercadoLíder Gold */}
      <a
        href={ML_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 group"
      >
        <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-r from-[#F5C518] to-[#E0A800] text-[#2D3277] text-xs font-bold">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
            <path d="M9.05 2.93c.3-.92 1.6-.92 1.9 0l1.37 4.22h4.44c.97 0 1.37 1.24.59 1.81l-3.6 2.61 1.38 4.22c.3.92-.76 1.69-1.54 1.12L10 14.3l-3.59 2.61c-.78.57-1.84-.2-1.54-1.12l1.38-4.22-3.6-2.61c-.78-.57-.38-1.81.59-1.81h4.44L9.05 2.93Z" />
          </svg>
          MercadoLíder Gold
        </span>
        <span className="text-xs text-lavanda/60 group-hover:text-lavanda transition-colors">
          Vendedor con reputación verde en Mercado Libre
        </span>
      </a>

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
