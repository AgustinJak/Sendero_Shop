"use client";

import { useEffect, useState } from "react";
import type { MayoristaItem, MayoristaImagen, MayoristaTramo } from "@/types";

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function MayoristaItemCard({
  item,
  tramos,
}: {
  item: MayoristaItem;
  tramos: MayoristaTramo[];
}) {
  const imagenes = (item.imagenes ?? [])
    .slice()
    .sort((a: MayoristaImagen, b: MayoristaImagen) => a.orden - b.orden);

  // Precio de lista (PVP). El descuento se aplica por cantidad según los tramos.
  const pvp = item.precio_pvp;
  const preciosPorTramo =
    pvp != null
      ? tramos.map((t) => ({
          min: t.min,
          pct: t.pct,
          precio: Math.round(pvp * (1 - t.pct / 100)),
        }))
      : [];

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightboxOpen = lightboxIndex !== null;

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") {
        setLightboxIndex((i) =>
          i === null ? null : (i + 1) % imagenes.length
        );
      }
      if (e.key === "ArrowLeft") {
        setLightboxIndex((i) =>
          i === null ? null : (i - 1 + imagenes.length) % imagenes.length
        );
      }
    }
    window.addEventListener("keydown", onKey);
    // Bloquear scroll del body mientras está abierto
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightboxOpen, imagenes.length]);

  return (
    <>
      <div className="bg-[#0F1729] rounded-2xl overflow-hidden border border-[#8B85B2]/10 flex flex-col">
        {/* Galería de imágenes */}
        {imagenes.length > 0 ? (
          <div
            className={`grid gap-0.5 ${
              imagenes.length === 1
                ? "grid-cols-1"
                : imagenes.length <= 4
                ? "grid-cols-2"
                : "grid-cols-3"
            }`}
          >
            {imagenes.map((img: MayoristaImagen, i: number) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="relative group focus:outline-none focus:ring-2 focus:ring-[#D4A853] focus:z-10"
                aria-label={`Ver imagen ${i + 1} de ${item.titulo}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={`${item.titulo} — vista ${i + 1}`}
                  className="aspect-square w-full object-cover transition-transform group-hover:scale-105 cursor-zoom-in"
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="aspect-square bg-[#1C2541] flex items-center justify-center text-[#8B85B2]/20 text-xs">
            sin imagen
          </div>
        )}

        {/* Badge destacado */}
        {item.destacado && (
          <span className="absolute top-2 left-2 z-10 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md bg-[#D4A853] text-[#1C2541]">
            🔥 Alta rotación
          </span>
        )}

        {/* Info */}
        <div className="p-3 flex flex-col gap-1.5 flex-1">
          <h3 className="text-[#E8E6F0] text-sm font-medium leading-snug">
            {item.titulo}
          </h3>

          {item.codigo_ref && (
            <span className="text-[10px] font-mono text-[#8B85B2]/60 self-start bg-[#1C2541] px-2 py-0.5 rounded">
              {item.codigo_ref}
            </span>
          )}

          {/* Pricing B2B */}
          <div className="mt-auto pt-2">
            {pvp != null ? (
              <>
                {/* PVP sugerido (a cuánto lo revende el comercio) */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#B8B3D1]">PVP sugerido</span>
                  <span className="text-base font-bold text-[#E8E6F0]">{formatPrice(pvp)}</span>
                </div>

                {/* Tu precio según cantidad */}
                {preciosPorTramo.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#8B85B2]/10 space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-[#8B85B2]/50">Tu precio</p>
                    {preciosPorTramo.map((t) => (
                      <div key={t.min} className="flex items-center justify-between text-xs">
                        <span className="text-[#8B85B2]">Desde {t.min}u</span>
                        <span className="text-[#D4A853] font-medium">
                          {formatPrice(t.precio)}{" "}
                          <span className="text-[#D4A853]/60">(-{t.pct}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}

              </>
            ) : (
              <p className="text-xs text-[#8B85B2]/60">Precio a consultar</p>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 sm:p-8"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen ampliada de ${item.titulo}`}
        >
          {/* Cerrar */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center transition-colors"
            aria-label="Cerrar"
          >
            ×
          </button>

          {/* Contador + título */}
          <div className="absolute top-4 left-4 flex items-center gap-3 max-w-[calc(100%-4rem)]">
            {imagenes.length > 1 && (
              <span className="px-3 py-1 bg-white/10 text-white text-sm rounded-full whitespace-nowrap">
                {lightboxIndex! + 1} / {imagenes.length}
              </span>
            )}
            <span className="text-white/70 text-sm truncate">{item.titulo}</span>
          </div>

          {/* Anterior */}
          {imagenes.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(
                  (lightboxIndex! - 1 + imagenes.length) % imagenes.length
                );
              }}
              className="absolute left-4 sm:left-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center transition-colors"
              aria-label="Imagen anterior"
            >
              ‹
            </button>
          )}

          {/* Imagen */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagenes[lightboxIndex!].url}
            alt={`${item.titulo} — vista ${lightboxIndex! + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-lg cursor-default"
          />

          {/* Siguiente */}
          {imagenes.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((lightboxIndex! + 1) % imagenes.length);
              }}
              className="absolute right-4 sm:right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center transition-colors"
              aria-label="Imagen siguiente"
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  );
}
