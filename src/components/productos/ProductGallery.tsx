"use client";

import { useState } from "react";
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

  if (sorted.length === 0) {
    return (
      <div className="aspect-square bg-navy-deep rounded-xl border border-lavanda/10 flex items-center justify-center">
        <span className="text-lavanda/30">Sin imagen</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Imagen principal */}
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
            <Image
              src={sorted[selected].url}
              alt={sorted[selected].alt_text || nombre}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnails */}
      {sorted.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sorted.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelected(i)}
              className={`relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                i === selected
                  ? "border-purpura"
                  : "border-lavanda/10 hover:border-lavanda/30"
              }`}
            >
              <Image
                src={img.url}
                alt={img.alt_text || `${nombre} ${i + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
