"use client";

import { formatPrice } from "@/lib/utils";

interface PreviewData {
  nombre: string;
  precio: number;
  precio_oferta: number | null;
  linea: string;
  tamano: string;
  descripcion: string;
  destacado: boolean;
  stock_tipo: "print-on-demand" | "limitado";
  tiempo_produccion: number;
  imagenUrl?: string;
}

export default function ProductoPreview({ data }: { data: PreviewData }) {
  const tieneOferta =
    data.precio_oferta !== null &&
    data.precio_oferta > 0 &&
    data.precio_oferta < data.precio;

  const precioMostrar = tieneOferta ? data.precio_oferta! : data.precio;

  return (
    <div className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-5 sticky top-4">
      <h2 className="text-sm font-semibold text-niebla">Preview</h2>

      {/* Card Preview */}
      <div>
        <p className="text-[10px] text-lavanda/40 uppercase tracking-wider mb-2">
          Card del catálogo
        </p>
        <div className="bg-navy-deep rounded-xl overflow-hidden border border-lavanda/10 max-w-[220px]">
          <div className="aspect-square relative bg-lavanda/5 overflow-hidden">
            {data.imagenUrl ? (
              <img
                src={data.imagenUrl}
                alt={data.nombre || "Preview"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-lavanda/30 text-xs">Sin imagen</span>
              </div>
            )}
            {tieneOferta && (
              <span className="absolute top-2 left-2 bg-ambar text-navy-deep text-[10px] font-bold px-1.5 py-0.5 rounded">
                OFERTA
              </span>
            )}
            {data.destacado && !tieneOferta && (
              <span className="absolute top-2 left-2 bg-purpura text-niebla text-[10px] font-bold px-1.5 py-0.5 rounded">
                DESTACADO
              </span>
            )}
          </div>
          <div className="p-3">
            {data.linea && (
              <p className="text-[10px] text-lavanda/60 mb-0.5 uppercase tracking-wider">
                {data.linea}
              </p>
            )}
            <h3 className="text-xs font-medium text-niebla truncate">
              {data.nombre || "Nombre del producto"}
            </h3>
            <div className="mt-1.5 flex items-center gap-1.5">
              {tieneOferta ? (
                <>
                  <span className="text-ambar font-bold text-xs">
                    {formatPrice(data.precio_oferta!)}
                  </span>
                  <span className="text-lavanda/50 text-[10px] line-through">
                    {formatPrice(data.precio)}
                  </span>
                </>
              ) : data.precio > 0 ? (
                <span className="text-lavanda font-semibold text-xs">
                  {formatPrice(data.precio)}
                </span>
              ) : (
                <span className="text-lavanda/40 text-xs">$0</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Preview */}
      <div>
        <p className="text-[10px] text-lavanda/40 uppercase tracking-wider mb-2">
          Detalle del producto
        </p>
        <div className="bg-navy-deep rounded-xl border border-lavanda/10 p-4 space-y-3">
          {data.linea && (
            <p className="text-[10px] text-lavanda/60 uppercase tracking-wider">
              {data.linea}
            </p>
          )}

          <h3 className="font-[family-name:var(--font-cinzel)] text-base font-bold text-niebla">
            {data.nombre || "Nombre del producto"}
          </h3>

          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-ambar">
              {precioMostrar > 0 ? formatPrice(precioMostrar) : "$0"}
            </span>
            {tieneOferta && (
              <span className="text-sm text-lavanda/50 line-through">
                {formatPrice(data.precio)}
              </span>
            )}
          </div>

          <div className="border-t border-lavanda/10 pt-3 space-y-1.5">
            {data.tamano && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-lavanda/60">Tamaño</span>
                <span className="text-lavanda-light">{data.tamano}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-lavanda/60">Producción</span>
              <span className="text-lavanda-light">
                {data.tiempo_produccion} días hábiles
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-lavanda/60">Tipo</span>
              <span className="text-lavanda-light">
                {data.stock_tipo === "print-on-demand"
                  ? "Fabricado a pedido"
                  : "Stock limitado"}
              </span>
            </div>
          </div>

          {data.descripcion && (
            <div className="border-t border-lavanda/10 pt-3">
              <p className="text-[10px] font-bold text-niebla uppercase tracking-wider mb-1">
                Descripción
              </p>
              <div
                className="text-[11px] text-lavanda-light leading-relaxed line-clamp-4"
                dangerouslySetInnerHTML={{ __html: data.descripcion }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
