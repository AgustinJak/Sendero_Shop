"use client";

import Link from "next/link";
import { whatsappLink } from "@/lib/utils";
import type { MayoristaTramo } from "@/types";

function WhatsappIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.528 5.843L.057 23.5l5.799-1.52A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.37l-.36-.214-3.727.977.995-3.636-.235-.374A9.818 9.818 0 1 1 12 21.818z" />
    </svg>
  );
}

/**
 * Tarjeta de captación mayorista que aparece en TODOS los productos.
 * Si el producto está en una lista mayorista (`listaCodigo`), el CTA lleva a
 * esa lista; si no, abre WhatsApp. El texto vive acá — editar libremente.
 */
export default function MayoristaCallout({
  whatsapp,
  nombreProducto,
  listaCodigo,
  tramos = [],
}: {
  whatsapp: string;
  nombreProducto: string;
  listaCodigo?: string | null;
  /** Tramos reales que aplica el carrito — misma fuente que el precio cobrado. */
  tramos?: MayoristaTramo[];
}) {
  const waHref = whatsappLink(
    whatsapp,
    `Hola! Quiero consultar precios mayoristas (vi: ${nombreProducto})`
  );

  const ordenados = tramos.slice().sort((a, b) => a.min - b.min);

  return (
    <div className="rounded-2xl border border-ambar/25 bg-gradient-to-br from-ambar/10 to-navy-deep p-5 sm:p-6">
      <h3 className="font-[family-name:var(--font-cinzel)] text-base font-bold text-niebla flex items-center gap-2">
        <span aria-hidden="true">🛍️</span> ¿Buscás precios por mayor?
      </h3>
      <p className="mt-1 text-sm text-lavanda-light">Llevando más, pagás menos:</p>

      {/* Tiers de descuento */}
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
        Ideal para revendedores. Sumá unidades al carrito y{" "}
        <strong className="font-semibold text-niebla">
          el descuento se aplica solo en el checkout
        </strong>
        : el porcentaje sale de la cantidad de cada modelo, así que podés
        combinar varios y cada uno lleva su descuento 💜
      </p>

      {listaCodigo ? (
        <>
          {/* Producto en una lista mayorista → CTA a la lista */}
          <Link
            href={`/mayorista/${listaCodigo}`}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-ambar hover:bg-ambar-light text-navy text-sm font-semibold rounded-lg transition-[background-color,transform] duration-150 ease-out active:scale-[0.98]"
          >
            Ver precios mayoristas
            <span aria-hidden="true">→</span>
          </Link>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 w-full inline-flex items-center justify-center gap-2 text-xs text-lavanda-light hover:text-niebla transition-colors"
          >
            <WhatsappIcon />
            ¿Dudas? Consultanos por WhatsApp
          </a>
        </>
      ) : (
        /* Producto sin lista → WhatsApp como CTA principal */
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-ambar hover:bg-ambar-light text-navy text-sm font-semibold rounded-lg transition-[background-color,transform] duration-150 ease-out active:scale-[0.98]"
        >
          <WhatsappIcon />
          Consultar precios mayoristas
        </a>
      )}
    </div>
  );
}
