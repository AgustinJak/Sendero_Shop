import { tramoParaCantidad } from "@/lib/mayorista";
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
 * Refleja la situación real de este producto: marca el tramo alcanzado y
 * cuántas unidades faltan para el siguiente, contando lo que ya hay en el
 * carrito más lo que está por agregarse. Sin tramos configurados no hay nada
 * que comunicar y no se renderiza.
 */
export default function MayoristaCallout({
  tramos = [],
  cantidadActual = 0,
}: {
  /** Tramos reales que aplica el carrito — misma fuente que el precio cobrado. */
  tramos?: MayoristaTramo[];
  /** Unidades de este producto: las del carrito + las que se van a agregar. */
  cantidadActual?: number;
}) {
  const ordenados = tramos.slice().sort((a, b) => a.min - b.min);
  if (ordenados.length === 0) return null;

  const alcanzado = tramoParaCantidad(ordenados, cantidadActual);
  const siguiente = ordenados.find((t) => t.min > cantidadActual) ?? null;
  const faltan = siguiente ? siguiente.min - cantidadActual : 0;

  return (
    <div className="rounded-2xl border border-ambar/25 bg-gradient-to-br from-ambar/10 to-navy-deep p-5 sm:p-6">
      <h3 className="font-[family-name:var(--font-cinzel)] text-base font-bold text-niebla flex items-center gap-2">
        <TagIcon />
        ¿Buscás precios por mayor?
      </h3>
      <p className="mt-1 text-sm text-lavanda-light">Llevando más, pagás menos:</p>

      <ul className="mt-3 space-y-1.5">
        {ordenados.map((t) => {
          const activo = alcanzado?.min === t.min;
          const superado = cantidadActual >= t.min && !activo;
          return (
            <li
              key={t.min}
              className={`flex items-center justify-between gap-3 text-sm rounded-lg px-3 py-2 transition-colors ${
                activo
                  ? "bg-ambar/15 ring-1 ring-ambar/40"
                  : "bg-navy-deep/60"
              }`}
            >
              <span
                className={
                  activo
                    ? "text-niebla font-medium"
                    : superado
                      ? "text-lavanda/50"
                      : "text-lavanda-light"
                }
              >
                Desde {t.min} unidades
              </span>
              <span
                className={`font-semibold whitespace-nowrap ${
                  activo ? "text-ambar" : superado ? "text-ambar/40" : "text-ambar"
                }`}
              >
                {t.pct}% OFF
              </span>
            </li>
          );
        })}
      </ul>

      {/* Empujón concreto según lo que ya lleva */}
      {alcanzado ? (
        <p className="mt-3 text-sm leading-relaxed text-emerald-400">
          Con {cantidadActual} unidades{" "}
          <strong className="font-semibold">
            te llevás {alcanzado.pct}% OFF
          </strong>
          .
          {siguiente && (
            <span className="text-lavanda-light">
              {" "}
              Sumá {faltan} más y llegás al {siguiente.pct}%.
            </span>
          )}
        </p>
      ) : siguiente && cantidadActual > 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-lavanda-light">
          Llevás {cantidadActual}:{" "}
          <strong className="font-semibold text-niebla">
            sumá {faltan} más y te llevás {siguiente.pct}% OFF
          </strong>
          .
        </p>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-lavanda-light">
          Sumá unidades al carrito y{" "}
          <strong className="font-semibold text-niebla">
            el descuento se aplica solo en el checkout
          </strong>
          .
        </p>
      )}
    </div>
  );
}
