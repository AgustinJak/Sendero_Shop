"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { extractYouTubeId, getYouTubeThumbnail, isYouTubeUrl } from "@/lib/youtube";
import type { ProductoImagen, VarianteSeleccion } from "@/types";

interface ProductGalleryProps {
  imagenes: ProductoImagen[];
  nombre: string;
  selecciones?: VarianteSeleccion[];
}

export default function ProductGallery({
  imagenes,
  nombre,
  selecciones = [],
}: ProductGalleryProps) {
  const sorted = useMemo(
    () => [...imagenes].sort((a, b) => a.orden - b.orden),
    [imagenes]
  );
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [youtubeActive, setYoutubeActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartX = useRef<number | null>(null);

  // Reset YouTube player when switching slides
  useEffect(() => { setYoutubeActive(false); }, [selected]);

  if (sorted.length === 0) {
    return (
      <div className="aspect-square bg-navy-deep rounded-xl border border-lavanda/10 flex items-center justify-center">
        <span className="text-lavanda/50">Sin imagen</span>
      </div>
    );
  }

  const current = sorted[selected];
  const isVideo = current.tipo === "video";
  const isYT = isVideo && isYouTubeUrl(current.url);
  const ytId = isYT ? extractYouTubeId(current.url) : null;

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setLightboxOpen(false); setZoomed(false); }
      if (e.key === "ArrowRight" && selected < sorted.length - 1) setSelected(s => s + 1);
      if (e.key === "ArrowLeft" && selected > 0) setSelected(s => s - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, selected, sorted.length]);

  // Jump to image linked to selected variant option
  const seleccionKey = selecciones.map((s) => s.opcion_id).join(",");
  useEffect(() => {
    if (selecciones.length === 0) return;
    const selectedOpcionIds = selecciones.map((s) => s.opcion_id);
    const matchIdx = sorted.findIndex(
      (img) => img.opcion_id && selectedOpcionIds.includes(img.opcion_id)
    );
    if (matchIdx !== -1) {
      setSelected(matchIdx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionKey]);

  return (
    <div className="space-y-4">
      {/* Main display */}
      <div
        className={`aspect-square relative bg-navy-deep rounded-xl overflow-hidden border border-lavanda/10 ${!isVideo ? "cursor-pointer" : ""}`}
        onClick={() => {
          if (!isVideo) setLightboxOpen(true);
          else if (isYT && !youtubeActive) setLightboxOpen(true);
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={selected}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            {isYT ? (
              youtubeActive ? (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={nombre}
                  className="w-full h-full"
                />
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setYoutubeActive(true); }}
                  className="relative w-full h-full group"
                >
                  <img
                    src={getYouTubeThumbnail(ytId!)}
                    alt={current.alt_text || nombre}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-all">
                      <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </button>
              )
            ) : isVideo ? (
              <video
                ref={videoRef}
                src={current.url}
                controls
                playsInline
                preload="metadata"
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <Image
                src={current.url}
                alt={current.alt_text || nombre}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnails */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sorted.map((media, i) => (
            <button
              key={media.id}
              onClick={() => setSelected(i)}
              className={`relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                i === selected
                  ? "border-purpura"
                  : "border-lavanda/10 hover:border-lavanda/30"
              }`}
            >
              {media.tipo === "video" && isYouTubeUrl(media.url) ? (
                <div className="relative w-full h-full bg-navy-deep">
                  <img
                    src={getYouTubeThumbnail(extractYouTubeId(media.url)!)}
                    alt={media.alt_text || "Video"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 bg-red-600/90 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : media.tipo === "video" ? (
                <div className="relative w-full h-full bg-navy-deep">
                  <video src={media.url} muted preload="metadata" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <Image
                  src={media.url}
                  alt={media.alt_text || `${nombre} ${i + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center"
            onClick={() => { setLightboxOpen(false); setZoomed(false); }}
            onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return;
              const diff = e.changedTouches[0].clientX - touchStartX.current;
              if (Math.abs(diff) > 50) {
                if (diff < 0 && selected < sorted.length - 1) { setSelected(s => s + 1); setZoomed(false); }
                if (diff > 0 && selected > 0) { setSelected(s => s - 1); setZoomed(false); }
              }
              touchStartX.current = null;
            }}
          >
            {/* Close button */}
            <button
              className="absolute top-4 right-4 text-white/70 hover:text-white z-10 p-2"
              onClick={() => { setLightboxOpen(false); setZoomed(false); }}
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation arrows */}
            {selected > 0 && (
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 z-10"
                onClick={(e) => { e.stopPropagation(); setSelected(s => s - 1); setZoomed(false); }}
              >
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}
            {selected < sorted.length - 1 && (
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-2 z-10"
                onClick={(e) => { e.stopPropagation(); setSelected(s => s + 1); setZoomed(false); }}
              >
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )}

            {/* Content */}
            {isYT ? (
              <motion.div
                key={selected}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-[90vw] max-w-[1000px] aspect-video"
                onClick={(e) => e.stopPropagation()}
              >
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={nombre}
                  className="w-full h-full rounded-lg"
                />
              </motion.div>
            ) : !isVideo ? (
              <motion.div
                key={selected}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`relative ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
                onClick={(e) => { e.stopPropagation(); setZoomed(!zoomed); }}
              >
                <Image
                  src={current.url}
                  alt={current.alt_text || nombre}
                  width={zoomed ? 1600 : 800}
                  height={zoomed ? 1600 : 800}
                  className={`max-h-[85vh] w-auto object-contain transition-transform duration-300 ${zoomed ? "scale-150" : "scale-100"}`}
                  quality={90}
                />
              </motion.div>
            ) : null}

            {/* Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-sm">
              {selected + 1} / {sorted.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
