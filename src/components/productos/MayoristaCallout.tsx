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
 * Refleja la situación real de este producto: marca el tramo alcanzado según
 * lo que ya hay en el carrito, cuántas unidades faltan para el siguiente, y
 * permite saltar a cualquier tramo de un toque. Sin tramos configurados no hay
 * nada que comunicar y no se renderiza.
 */
export default function MayoristaCallout({
  tramos = [],
  cantidadEnCarrito = 0,
  onElegirTramo,
}: {
  /** Tramos reales que aplica el carrito — misma fuente que el precio cobrado. */
  tramos?: MayoristaTramo[];
  /**
   * Unidades de este producto que ya están en el carrito. Toda la tarjeta se
   * apoya en este número — incluir además lo que marca el selector haría que
   * el "+N" de cada fila y el "sumá N más" del pie no coincidieran.
   */
  cantidadEnCarrito?: number;
  /** Atajo: llevar la línea hasta `min` unidades. */
  onElegirTramo?: (min: number) => void;
}) {
  const ordenados = tramos.slice().sort((a, b) => a.min - b.min);
  if (ordenados.length === 0) return null;

  const alcanzado = tramoParaCantidad(ordenados, cantidadEnCarrito);
  const siguiente = ordenados.find((t) => t.min > cantidadEnCarrito) ?? null;
  const faltan = siguiente ? siguiente.min - cantidadEnCarrito : 0;

  return (
    <div className="rounded-2xl border border-ambar/25 bg-gradient-to-br from-ambar/10 to-navy-deep p-5 sm:p-6">
      <p className="text-base font-semibold text-texto flex items-center gap-2">
        <TagIcon />
        ¿Buscás precios por mayor?
      </p>
      <p className="mt-1 text-sm text-lavanda-light">Llevando más, pagás menos:</p>

      <ul className="mt-3 space-y-1.5">
        {ordenados.map((t) => {
          const activo = alcanzado?.min === t.min;
          const superado = cantidadEnCarrito >= t.min && !activo;
          // Ya cubierto por el carrito: no hay nada que sumar.
          const yaEnCarrito = cantidadEnCarrito >= t.min;
          const faltanParaEste = t.min - cantidadEnCarrito;
          const accionable = !!onElegirTramo && !yaEnCarrito;

          const contenido = (
            <>
              <span
                className={
                  activo
                    ? "text-niebla font-medium"
                    : superado
                      ? "text-texto-3"
                      : "text-lavanda-light"
                }
              >
                Desde {t.min} unidades
              </span>
              <span className="flex items-center gap-2 whitespace-nowrap">
                <span
                  className={`font-semibold ${
                    superado ? "text-ambar/40" : "text-ambar"
                  }`}
                >
                  {t.pct}% OFF
                </span>
                {accionable ? (
                  <span className="text-xs text-texto-3 group-hover:text-niebla transition-colors">
                    +{faltanParaEste}
                  </span>
                ) : (
                  yaEnCarrito && (
                    <svg
                      className="w-4 h-4 text-emerald-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )
                )}
              </span>
            </>
          );

          const estilo = `flex w-full items-center justify-between gap-3 text-sm rounded-lg px-3 py-2 transition-colors ${
            activo ? "bg-ambar/15 ring-1 ring-ambar/40" : "bg-navy-deep/60"
          }`;

          return (
            <li key={t.min}>
              {accionable ? (
                <button
                  type="button"
                  onClick={() => onElegirTramo(t.min)}
                  className={`group ${estilo} text-left hover:bg-ambar/10 hover:ring-1 hover:ring-ambar/30 cursor-pointer`}
                  aria-label={`Agregar ${faltanParaEste} unidades para llegar al ${t.pct}% de descuento`}
                >
                  {contenido}
                </button>
              ) : (
                <div className={estilo}>{contenido}</div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Empujón concreto según lo que ya lleva */}
      {alcanzado ? (
        <p className="mt-3 text-sm leading-relaxed text-emerald-400">
          Con {cantidadEnCarrito} unidades{" "}
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
      ) : siguiente && cantidadEnCarrito > 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-lavanda-light">
          Llevás {cantidadEnCarrito}:{" "}
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
