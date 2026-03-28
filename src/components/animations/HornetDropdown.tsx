"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

// Categorías placeholder — se reemplazarán con datos de Supabase
const PLACEHOLDER_CATEGORIES = [
  {
    nombre: "Anime",
    slug: "anime",
    children: [
      { nombre: "One Piece", slug: "anime/one-piece" },
      { nombre: "Demon Slayer", slug: "anime/demon-slayer" },
      { nombre: "Bleach", slug: "anime/bleach" },
      { nombre: "Dragon Ball", slug: "anime/dragon-ball" },
    ],
  },
  {
    nombre: "Cine",
    slug: "cine",
    children: [
      { nombre: "Star Wars", slug: "cine/star-wars" },
      { nombre: "Marvel", slug: "cine/marvel" },
    ],
  },
  {
    nombre: "Videojuegos",
    slug: "videojuegos",
    children: [
      { nombre: "Hollow Knight", slug: "videojuegos/hollow-knight" },
      { nombre: "Elden Ring", slug: "videojuegos/elden-ring" },
    ],
  },
  {
    nombre: "Katanas",
    slug: "katanas",
    children: [],
  },
  {
    nombre: "Figuras",
    slug: "figuras",
    children: [],
  },
];

export default function HornetDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 300);
  };

  const handleClick = () => {
    setIsOpen((prev) => !prev);
  };

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Trigger */}
      <button
        onClick={handleClick}
        className="text-lavanda-light hover:text-niebla transition-colors flex items-center gap-1"
      >
        Categorías
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </motion.svg>
      </button>

      {/* Dropdown — Hornet debajo del menú, como arrastrándolo */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-1/2 -translate-x-1/2 pt-2"
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 24,
              mass: 0.8,
            }}
          >
            <div className="relative">
              {/* Menú de categorías */}
              <motion.div
                className="bg-navy-deep/98 backdrop-blur-md border border-lavanda/20 rounded-xl shadow-2xl shadow-black/50 overflow-hidden min-w-[280px]"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2, delay: 0.05 }}
              >
                <div className="p-3">
                  {PLACEHOLDER_CATEGORIES.map((cat, index) => (
                    <motion.div
                      key={cat.slug}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.2,
                        delay: 0.08 + index * 0.04,
                      }}
                    >
                      <div className="group">
                        <Link
                          href={`/categorias/${cat.slug}`}
                          className="flex items-center justify-between px-3 py-2 rounded-lg text-niebla hover:bg-lavanda/10 transition-colors font-[family-name:var(--font-cinzel)] text-sm"
                          onClick={() => setIsOpen(false)}
                        >
                          {cat.nombre}
                          {cat.children.length > 0 && (
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 16 16"
                              fill="currentColor"
                              className="w-3 h-3 text-lavanda/50 group-hover:text-lavanda transition-colors"
                            >
                              <path
                                fillRule="evenodd"
                                d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </Link>
                        {cat.children.length > 0 && (
                          <div className="ml-4 border-l border-lavanda/10 pl-2">
                            {cat.children.map((sub) => (
                              <Link
                                key={sub.slug}
                                href={`/categorias/${sub.slug}`}
                                className="block px-3 py-1.5 text-xs text-lavanda-light hover:text-niebla hover:bg-lavanda/5 rounded-md transition-colors"
                                onClick={() => setIsOpen(false)}
                              >
                                {sub.nombre}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="border-t border-lavanda/10 px-3 py-2">
                  <Link
                    href="/categorias"
                    className="block text-center text-xs text-lavanda hover:text-niebla transition-colors py-1"
                    onClick={() => setIsOpen(false)}
                  >
                    Ver todas las categorías →
                  </Link>
                </div>
              </motion.div>

              {/* Hornet — agarrada de la esquina inferior izquierda del menú */}
              <motion.div
                className="absolute -bottom-42 -left-34 z-10"
                initial={{ opacity: 0, y: -20 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  rotate: [0, -1.5, 1.5, -0.5, 0],
                }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  opacity: { duration: 0.3, delay: 0.15 },
                  y: { duration: 0.4, delay: 0.15 },
                  rotate: {
                    duration: 4,
                    delay: 0.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    repeatType: "loop",
                  },
                }}
                style={{ transformOrigin: "top right" }}
              >
                <Image
                  src="/assets/hornet.png"
                  alt="Hornet"
                  width={260}
                  height={325}
                  className="drop-shadow-[0_0_25px_rgba(196,30,58,0.5)] pointer-events-none select-none"
                  priority
                />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
