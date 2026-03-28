"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HornetDropdown from "@/components/animations/HornetDropdown";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-navy-deep/95 backdrop-blur-sm border-b border-lavanda/10">
      {/* Banner de anuncios — placeholder */}

      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla tracking-wider">
              SENDERO SHOP
            </span>
          </Link>

          {/* Nav Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/catalogo"
              className="text-lavanda-light hover:text-niebla transition-colors"
            >
              Catálogo
            </Link>

            {/* Categorías con Hornet */}
            <HornetDropdown />

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
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-4">
            {/* Buscador — placeholder */}
            <button
              aria-label="Buscar"
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
            <Link
              href="/carrito"
              className="relative text-lavanda-light hover:text-niebla transition-colors"
              aria-label="Carrito"
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
                  d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                />
              </svg>
              {/* Badge contador — se conectará con useCart */}
            </Link>

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
                <Link
                  href="/categorias"
                  className="text-lavanda-light hover:text-niebla transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Categorías
                </Link>
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
}
