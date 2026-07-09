"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import HornetDropdown from "@/components/animations/HornetDropdown";
import CartBadge from "@/components/carrito/CartBadge";
import type { Categoria } from "@/types";

interface HeaderClientProps {
  categorias: Categoria[];
  children?: React.ReactNode;
}

export default function HeaderClient({ categorias, children }: HeaderClientProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.push(`/catalogo?q=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setSearchQuery("");
  }

  return (
    <header className="sticky top-0 z-50 bg-navy-deep/95 backdrop-blur-sm border-b border-lavanda/10">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          {children}

          {/* Nav Desktop */}
          <div className="hidden md:flex items-center gap-8">
            {/* Catálogo: hover abre las categorías, click va al catálogo */}
            <HornetDropdown categorias={categorias} />

            <Link
              href="/nosotros"
              className="text-lavanda-light hover:text-niebla transition-colors"
            >
              Nosotros
            </Link>

            <Link
              href="/contacto"
              className="text-lavanda-light hover:text-niebla transition-colors"
            >
              Contacto
            </Link>

            <Link
              href="/mi-pedido"
              className="text-lavanda-light hover:text-niebla transition-colors"
            >
              Mi pedido
            </Link>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-4">
            {/* Buscador */}
            <button
              aria-label="Buscar"
              onClick={() => setSearchOpen(true)}
              className="text-lavanda-light hover:text-niebla transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                />
              </svg>
            </button>

            {/* Carrito */}
            <CartBadge />

            {/* Hamburger Mobile */}
            <button
              className="md:hidden text-lavanda-light"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menú"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                {menuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-lavanda/10"
            >
              <div className="flex flex-col gap-4 py-4">
                <Link
                  href="/catalogo"
                  className="text-lavanda-light hover:text-niebla transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Catálogo
                </Link>

                {/* Categorías en mobile */}
                {categorias.map((cat) => (
                  <div key={cat.slug}>
                    <Link
                      href={`/catalogo?categoria=${cat.slug}`}
                      className="text-lavanda-light hover:text-niebla transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      {cat.nombre}
                    </Link>
                    {cat.children && cat.children.length > 0 && (
                      <div className="ml-4 mt-1 flex flex-col gap-1">
                        {cat.children.map((sub) => (
                          <Link
                            key={sub.slug}
                            href={`/catalogo?categoria=${sub.slug}`}
                            className="text-sm text-lavanda/75 hover:text-niebla transition-colors"
                            onClick={() => setMenuOpen(false)}
                          >
                            {sub.nombre}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                <Link
                  href="/nosotros"
                  className="text-lavanda-light hover:text-niebla transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Nosotros
                </Link>
                <Link
                  href="/contacto"
                  className="text-lavanda-light hover:text-niebla transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Contacto
                </Link>
                <Link
                  href="/mi-pedido"
                  className="text-lavanda-light hover:text-niebla transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Mi pedido
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Search overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] bg-navy-deep/95 backdrop-blur-md flex items-start justify-center pt-24 px-4"
            onClick={() => setSearchOpen(false)}
          >
            <motion.form
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSearch}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg"
            >
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-lavanda/50"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar productos..."
                  className="w-full pl-12 pr-12 py-4 bg-navy border border-lavanda/20 rounded-xl text-lg text-niebla placeholder:text-lavanda/60 focus:outline-none focus:border-purpura"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-lavanda/50 hover:text-niebla transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-center text-xs text-lavanda/60 mt-3">
                Presioná Enter para buscar
              </p>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
