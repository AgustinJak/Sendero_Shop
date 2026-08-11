import type { MayoristaTramo } from "@/types";

function TagIcon() {
  return (
    <svg
      className="w-5 h-5 text-ambar"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.25 12.76V6a2.25 2.25 0 0 1 2.25-2.25h6.76c.6 0 1.17.24 1.59.66l7.5 7.5a2.25 2.25 0 0 1 0 3.18l-6.76 6.76a2.25 2.25 0 0 1-3.18 0l-7.5-7.5a2.25 2.25 0 0 1-.66-1.59Z" />
      <path d="M6.75 7.5h.008v.008H6.75V7.5Z" />
    </svg>
  );
}

/**
 * Tarjeta de descuentos por cantidad, presente en todos los productos.
 *
 * Es puramente informativa: la acción vive en el botón de compra de la página,
 * porque el descuento se aplica solo al sumar unidades. Sin tramos
 * configurados no hay nada que comunicar y no se renderiza.
 */
export default function MayoristaCallout({
  tramos = [],
}: {
  /** Tramos reales que aplica el carrito — misma fuente que el precio cobrado. */
  tramos?: MayoristaTramo[];
}) {
  const ordenados = tramos.slice().sort((a, b) => a.min - b.min);
  if (ordenados.length === 0) return null;

  return (
    <div className="rounded-2xl border border-ambar/25 bg-gradient-to-br from-ambar/10 to-navy-deep p-5 sm:p-6">
      <h3 className="font-[family-name:var(--font-cinzel)] text-base font-bold text-niebla flex items-center gap-2">
        <TagIcon />
        ¿Buscás precios por mayor?
      </h3>
      <p className="mt-1 text-sm text-lavanda-light">Llevando más, pagás menos:</p>

      <ul className="mt-3 space-y-1.5">
        {ordenados.map((t) => (
          <li
            key={t.min}
            className="flex items-center justify-between gap-3 text-sm rounded-lg bg-navy-deep/60 px-3 py-2"
          >
            <span className="text-lavanda-light">Desde {t.min} unidades</span>
            <span className="text-ambar font-semibold whitespace-nowrap">
              {t.pct}% OFF
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-sm text-lavanda-light leading-relaxed">
        Sumá unidades al carrito y{" "}
        <strong className="font-semibold text-niebla">
          el descuento se aplica solo en el checkout
        </strong>
        .
      </p>
    </div>
  );
}
