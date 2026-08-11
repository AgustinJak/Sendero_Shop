"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import type { Categoria } from "@/types";

interface HornetDropdownProps {
  categorias?: Categoria[];
}

export default function HornetDropdown({ categorias = [] }: HornetDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeParent, setActiveParent] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);

  // Abrir cancelando cualquier cierre pendiente; cerrar con un pequeño
  // delay (grace period) para que mover el mouse hacia el menú no parpadee.
  const open = () => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setIsOpen(true);
  };
  const scheduleClose = () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setIsOpen(false), 120);
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    };
  }, []);

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    if (isOpen) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen]);


  // Padre activo (para mostrar sus subcategorías a la derecha). Fallback al primero.
  const active =
    categorias.find((c) => c.slug === activeParent) ?? categorias[0] ?? null;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={open}
      onMouseLeave={scheduleClose}
    >
      {/* Trigger: hover abre la lista, click lleva al catálogo */}
      <Link
        href="/catalogo"
        className="text-lavanda-light hover:text-niebla transition-colors flex items-center gap-1"
      >
        Catálogo
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
      </Link>

      {/* Dropdown — Hornet debajo del menú, como arrastrándolo.
          Sin AnimatePresence: dejaba el panel pegado, invisible pero clickeable,
          y los clicks bajo el header caían en categorías que no se veían. */}
      {isOpen && (
          <div
            className="absolute top-full left-0 pt-2 animate-drop-in"
            style={{ willChange: "transform" }}
          >
            <div className="relative">
              {/* Menú de categorías */}
              <motion.div
                className="bg-navy-deep/98 backdrop-blur-md border border-lavanda/20 rounded-xl shadow-2xl shadow-black/50 overflow-hidden w-[600px] max-w-[calc(100vw-2rem)]"
                initial={{ scale: 0.98 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.15, delay: 0.03 }}
              >
                <div className="flex">
                  {/* Izquierda: categorías padre (hover abre sus subcategorías) */}
                  <div className="w-56 shrink-0 p-2 border-r border-lavanda/10 max-h-[65vh] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {categorias.map((cat) => {
                      const isActive = active?.slug === cat.slug;
                      return (
                        <Link
                          key={cat.slug}
                          href={`/catalogo?categoria=${cat.slug}`}
                          onMouseEnter={() => setActiveParent(cat.slug)}
                          onFocus={() => setActiveParent(cat.slug)}
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-[family-name:var(--font-cinzel)] transition-colors ${
                            isActive
                              ? "bg-lavanda/10 text-niebla"
                              : "text-lavanda-light hover:text-niebla hover:bg-lavanda/5"
                          }`}
                        >
                          <span className="truncate">{cat.nombre}</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                              isActive ? "text-lavanda" : "text-lavanda/30"
                            }`}
                          >
                            <path
                              fillRule="evenodd"
                              d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Derecha: subcategorías del padre activo */}
                  <div className="flex-1 min-w-0 p-4">
                    {active && (
                      <>
                        <div className="flex items-center justify-between gap-3 border-b border-lavanda/10 pb-2 mb-3">
                          <h3 className="font-[family-name:var(--font-cinzel)] text-niebla text-sm truncate">
                            {active.nombre}
                          </h3>
                          <Link
                            href={`/catalogo?categoria=${active.slug}`}
                            onClick={() => setIsOpen(false)}
                            className="shrink-0 text-xs text-ambar hover:text-ambar-light transition-colors"
                          >
                            Ver todo →
                          </Link>
                        </div>
                        {active.children && active.children.length > 0 ? (
                          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5">
                            {active.children.map((sub) => (
                              <Link
                                key={sub.slug}
                                href={`/catalogo?categoria=${sub.slug}`}
                                onClick={() => setIsOpen(false)}
                                className="px-2 py-1.5 text-sm text-lavanda-light hover:text-niebla hover:bg-lavanda/5 rounded-md transition-colors truncate"
                              >
                                {sub.nombre}
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <Link
                            href={`/catalogo?categoria=${active.slug}`}
                            onClick={() => setIsOpen(false)}
                            className="inline-block px-2 py-1.5 text-sm text-lavanda-light hover:text-niebla transition-colors"
                          >
                            Ver todos los productos de {active.nombre} →
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Botón pronunciado: ver todos los productos */}
                <div className="border-t border-lavanda/10 p-3">
                  <Link
                    href="/catalogo"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-semibold rounded-lg transition-[background-color,transform] duration-150 ease-out active:scale-[0.98]"
                  >
                    Ver todos los productos
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </motion.div>

              {/* Hornet — agarrada de la esquina inferior derecha del menú, colgando.
                  pointer-events-none: es decorativa, no debe agrandar el área de hover. */}
              <motion.div
                className="absolute z-10 pointer-events-none"
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
                // Posición de la Hornet en píxeles (bottom/right). Cambiá estos
                // dos números y guardá: más negativo bottom = más abajo; más
                // negativo right = más a la derecha. Positivo = al revés.
                style={{ transformOrigin: "top right", bottom: -180, right: 300 }}
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
          </div>
        )}
    </div>
  );
}
