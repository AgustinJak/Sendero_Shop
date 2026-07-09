"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { MayoristaItem, MayoristaImagen, MayoristaTramo } from "@/types";
import { extractYouTubeId, getYouTubeThumbnail, isYouTubeUrl } from "@/lib/youtube";

function formatPrice(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function PlayBadge({ small = false }: { small?: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className={`${small ? "w-6 h-6" : "w-11 h-11"} rounded-full bg-black/55 flex items-center justify-center`}
      >
        <svg className={`${small ? "w-3 h-3" : "w-5 h-5"} text-white ml-0.5`} fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>
  );
}

export default function MayoristaItemCard({
  item,
  tramos,
  index = 0,
}: {
  item: MayoristaItem;
  tramos: MayoristaTramo[];
  index?: number;
}) {
  const reduce = useReducedMotion();
  const media = (item.imagenes ?? [])
    .slice()
    .sort((a: MayoristaImagen, b: MayoristaImagen) => a.orden - b.orden);

  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [ytPlaying, setYtPlaying] = useState(false);
  const [entered, setEntered] = useState(false); // animación de entrada del lightbox

  const hasMedia = media.length > 0;
  const hasMultiple = media.length > 1;
  const activo = hasMedia ? media[Math.min(current, media.length - 1)] : null;

  function go(dir: number) {
    setYtPlaying(false);
    setCurrent((c) => (c + dir + media.length) % media.length);
  }

  // Lightbox: teclado + bloqueo de scroll + animación de entrada
  useEffect(() => {
    if (!lightboxOpen) {
      setEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxOpen, media.length]);

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

  function isVid(m: MayoristaImagen | null) {
    return m?.tipo === "video";
  }
  function isYT(m: MayoristaImagen | null) {
    return !!m && m.tipo === "video" && isYouTubeUrl(m.url);
  }

  function thumbFor(m: MayoristaImagen) {
    if (isYT(m)) {
      const id = extractYouTubeId(m.url);
      return id ? getYouTubeThumbnail(id) : m.url;
    }
    return m.url;
  }

  return (
    <>
      <motion.div
        className="bg-[#0F1729] rounded-2xl overflow-hidden border border-[#8B85B2]/10 flex flex-col transition-[border-color,box-shadow] duration-200 [@media(hover:hover)]:hover:border-[#D4A853]/30 [@media(hover:hover)]:hover:shadow-lg [@media(hover:hover)]:hover:shadow-[#D4A853]/5"
        initial={reduce ? false : { opacity: 0, y: 12 }}
        whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.35, delay: Math.min(index, 6) * 0.045, ease: [0.23, 1, 0.32, 1] }}
      >
        {/* Media principal */}
        <div className="relative group">
          <button
            type="button"
            onClick={() => hasMedia && setLightboxOpen(true)}
            className="block w-full aspect-square focus:outline-none"
            aria-label={`Ver ${item.titulo}`}
          >
            {!activo ? (
              <div className="w-full h-full bg-[#1C2541] flex items-center justify-center text-[#8B85B2]/20 text-xs">
                sin imagen
              </div>
            ) : isVid(activo) ? (
              <div className="relative w-full h-full bg-black">
                {isYT(activo) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbFor(activo)} alt={item.titulo} className="w-full h-full object-cover" />
                ) : (
                  <video src={activo.url} muted preload="metadata" className="w-full h-full object-cover" />
                )}
                <PlayBadge />
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activo.url}
                alt={item.titulo}
                className="w-full h-full object-cover transition-transform group-hover:scale-[1.03] cursor-zoom-in"
              />
            )}
          </button>

          {/* Badge destacado */}
          {item.destacado && (
            <span className="absolute top-2 left-2 z-10 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md bg-[#D4A853] text-[#1C2541]">
              🔥 Alta rotación
            </span>
          )}

          {/* Flechas */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); go(-1); }}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                aria-label="Anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); go(1); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
                aria-label="Siguiente"
              >
                ›
              </button>
              <span className="absolute bottom-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-white/80">
                {current + 1}/{media.length}
              </span>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {hasMultiple && (
          <div className="flex gap-1 p-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setYtPlaying(false); setCurrent(i); }}
                className={`relative w-10 h-10 shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                  i === current ? "border-[#D4A853]" : "border-transparent hover:border-[#8B85B2]/40"
                }`}
                aria-label={`Ver ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbFor(m)} alt="" className="w-full h-full object-cover" />
                {isVid(m) && <PlayBadge small />}
              </button>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="p-3 flex flex-col gap-1.5 flex-1">
          <h3 className="text-[#E8E6F0] text-sm font-medium leading-snug">{item.titulo}</h3>

          {/* Pricing B2B */}
          <div className="mt-auto pt-2">
            {pvp != null ? (
              <>
                <div className="flex items-center justify-end">
                  <span className="text-lg font-bold text-[#E8E6F0]">{formatPrice(pvp)}</span>
                </div>
                {preciosPorTramo.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[#8B85B2]/10 space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-[#8B85B2]/50">Precio mayorista:</p>
                    {preciosPorTramo.map((t) => (
                      <div key={t.min} className="flex items-center justify-between text-xs">
                        <span className="text-[#8B85B2]">Desde {t.min}u</span>
                        <span className="text-[#D4A853] font-medium">
                          {formatPrice(t.precio)} c/u{" "}
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
      </motion.div>

      {/* Lightbox — zoom sobre la página con fondo blureado (no pantalla completa) */}
      {lightboxOpen && activo && (
        <div
          className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-4 sm:p-8 bg-[#0F1729]/70 backdrop-blur-md transition-opacity duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
            entered ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Imagen ampliada de ${item.titulo}`}
        >
          {/* Cerrar */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white text-2xl flex items-center justify-center transition-colors z-10"
            aria-label="Cerrar"
          >
            ×
          </button>

          {/* Contador + título */}
          <div className="absolute top-4 left-4 flex items-center gap-3 max-w-[calc(100%-4rem)]">
            {hasMultiple && (
              <span className="px-3 py-1 bg-black/40 text-white text-sm rounded-full whitespace-nowrap">
                {current + 1} / {media.length}
              </span>
            )}
            <span className="text-white/80 text-sm truncate">{item.titulo}</span>
          </div>

          {/* Anterior / Siguiente */}
          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); go(-1); }}
                className="absolute left-3 sm:left-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/45 hover:bg-black/70 text-white text-3xl flex items-center justify-center transition-colors z-10 shadow-lg"
                aria-label="Imagen anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); go(1); }}
                className="absolute right-3 sm:right-8 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/45 hover:bg-black/70 text-white text-3xl flex items-center justify-center transition-colors z-10 shadow-lg"
                aria-label="Imagen siguiente"
              >
                ›
              </button>
            </>
          )}

          {/* Contenido (zoom sutil de entrada) */}
          <div
            className={`flex items-center justify-center transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
              entered ? "scale-100" : "scale-95"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {isYT(activo) ? (
              ytPlaying ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${extractYouTubeId(activo.url)}?autoplay=1&rel=0&modestbranding=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={item.titulo}
                  className="w-[88vw] max-w-[900px] aspect-video rounded-xl shadow-2xl"
                />
              ) : (
                <button type="button" onClick={() => setYtPlaying(true)} className="relative w-[88vw] max-w-[900px] aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbFor(activo)} alt={item.titulo} className="w-full h-full object-contain rounded-xl shadow-2xl" />
                  <PlayBadge />
                </button>
              )
            ) : isVid(activo) ? (
              <video
                src={activo.url}
                controls
                autoPlay
                playsInline
                className="max-w-[88vw] max-h-[78vh] rounded-xl bg-black shadow-2xl ring-1 ring-white/10"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activo.url}
                alt={item.titulo}
                className="max-w-[88vw] max-h-[78vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
              />
            )}
          </div>

          {/* Tira de thumbnails (indica que hay más y permite navegar) */}
          {hasMultiple && (
            <div
              className="mt-4 flex gap-1.5 max-w-[92vw] overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {media.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setYtPlaying(false); setCurrent(i); }}
                  className={`relative w-12 h-12 shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    i === current ? "border-[#D4A853] opacity-100" : "border-transparent opacity-50 hover:opacity-80"
                  }`}
                  aria-label={`Ver ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbFor(m)} alt="" className="w-full h-full object-cover" />
                  {isVid(m) && <PlayBadge small />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
