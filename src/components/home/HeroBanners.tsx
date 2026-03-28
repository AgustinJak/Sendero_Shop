"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import type { Banner } from "@/types";

export default function HeroBanners({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % banners.length);
  }, [banners.length]);

  // Auto-advance every 6s
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [banners.length, next]);

  if (banners.length === 0) return null;

  const banner = banners[current];

  const content = (
    <AnimatePresence mode="wait">
      <motion.div
        key={banner.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full h-full"
      >
        {banner.imagen_url && (
          <img
            src={banner.imagen_url}
            alt={banner.titulo || "Banner"}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/60 to-navy/30" />

        {/* Text */}
        {(banner.titulo || banner.subtitulo) && (
          <div className="absolute inset-0 flex items-center justify-center text-center px-4">
            <div>
              {banner.titulo && (
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="font-[family-name:var(--font-cinzel)] text-3xl sm:text-4xl md:text-5xl font-bold text-niebla mb-4 drop-shadow-lg"
                >
                  {banner.titulo}
                </motion.h2>
              )}
              {banner.subtitulo && (
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-lg sm:text-xl text-lavanda-light max-w-2xl mx-auto drop-shadow"
                >
                  {banner.subtitulo}
                </motion.p>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <section className="relative h-[50vh] sm:h-[60vh] overflow-hidden">
      {banner.link ? (
        <Link href={banner.link} className="block w-full h-full">
          {content}
        </Link>
      ) : (
        content
      )}

      {/* Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === current
                  ? "bg-niebla scale-110"
                  : "bg-lavanda/40 hover:bg-lavanda/60"
              }`}
            />
          ))}
        </div>
      )}

      {/* Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-navy/50 text-niebla flex items-center justify-center hover:bg-navy/80 transition-colors"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-navy/50 text-niebla flex items-center justify-center hover:bg-navy/80 transition-colors"
          >
            ›
          </button>
        </>
      )}
    </section>
  );
}
