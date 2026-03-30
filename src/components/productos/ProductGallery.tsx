"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { ProductoImagen } from "@/types";

interface ProductGalleryProps {
  imagenes: ProductoImagen[];
  nombre: string;
}

export default function ProductGallery({
  imagenes,
  nombre,
}: ProductGalleryProps) {
  const sorted = [...imagenes].sort((a, b) => a.orden - b.orden);
  const [selected, setSelected] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (sorted.length === 0) {
    return (
      <div className="aspect-square bg-navy-deep rounded-xl border border-lavanda/10 flex items-center justify-center">
        <span className="text-lavanda/30">Sin imagen</span>
      </div>
    );
  }

  const current = sorted[selected];
  const isVideo = current.tipo === "video";

  return (
    <div className="space-y-4">
      {/* Main display */}
      <div className="aspect-square relative bg-navy-deep rounded-xl overflow-hidden border border-lavanda/10">
        <AnimatePresence mode="wait">
          <motion.div
            key={selected}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0"
          >
            {isVideo ? (
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
              {media.tipo === "video" ? (
                <div className="relative w-full h-full bg-navy-deep">
                  <video
                    src={media.url}
                    muted
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
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
    </div>
  );
}
