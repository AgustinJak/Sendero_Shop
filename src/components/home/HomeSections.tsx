"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import type { Categoria, Coleccion } from "@/types";

/* ── Colecciones con banner/imagen ── */

export function CollectionsSection({ colecciones }: { colecciones: Coleccion[] }) {
  const items = colecciones.slice(0, 3);

  if (items.length === 0) return null;

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <motion.h2
        className="font-[family-name:var(--font-cinzel)] text-2xl sm:text-3xl font-bold text-niebla mb-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        Colecciones
      </motion.h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {items.map((col, i) => (
          <motion.div
            key={col.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <Link
              href={`/coleccion/${col.slug}`}
              className="block relative group rounded-xl overflow-hidden border border-lavanda/10 hover:border-purpura/40 transition-all"
            >
              <div className="aspect-[16/10] relative bg-navy-deep">
                {col.imagen_cover ? (
                  <Image
                    src={col.imagen_cover}
                    alt={col.nombre}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-purpura/20 via-navy-deep to-navy" />
                )}
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/90 via-navy-deep/30 to-transparent" />
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                  <h3 className="font-[family-name:var(--font-cinzel)] text-lg sm:text-xl font-bold text-niebla group-hover:text-ambar transition-colors">
                    {col.nombre}
                  </h3>
                  {col.descripcion && (
                    <p className="text-xs sm:text-sm text-lavanda-light/70 mt-1 line-clamp-2">
                      {col.descripcion}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ── Categorías ── */

export function CategoriesSection({ categorias }: { categorias: Categoria[] }) {
  const items = categorias.length > 0 ? categorias : [];

  if (items.length === 0) return null;

  return (
    <section className="pb-16 px-4 max-w-7xl mx-auto">
      <motion.h2
        className="font-[family-name:var(--font-cinzel)] text-2xl sm:text-3xl font-bold text-niebla mb-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        Categorías
      </motion.h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {items.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            whileHover={{ scale: 1.02 }}
          >
            <Link
              href={`/catalogo?categoria=${cat.slug}`}
              className="block relative group bg-navy-deep rounded-xl overflow-hidden border border-lavanda/10 hover:border-lavanda/30 transition-colors"
            >
              <div className="aspect-[16/9] bg-lavanda/5 flex items-center justify-center">
                <span className="font-[family-name:var(--font-cinzel)] text-xl text-lavanda group-hover:text-niebla transition-colors">
                  {cat.nombre}
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function WhatsAppCTA() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto text-center bg-navy-deep rounded-2xl p-8 sm:p-12 border border-lavanda/10">
        <motion.h2
          className="font-[family-name:var(--font-cinzel)] text-2xl sm:text-3xl font-bold text-niebla mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          ¿Tenés una idea en mente?
        </motion.h2>
        <motion.p
          className="text-lavanda-light mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          Podemos imprimir casi cualquier cosa. Escribinos y te asesoramos
          sobre tu próxima pieza.
        </motion.p>
        <motion.a
          href="https://wa.me/5491125502785?text=Hola!%20Quiero%20consultar%20por%20un%20producto%20personalizado"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Escribinos por WhatsApp
        </motion.a>
      </div>
    </section>
  );
}
