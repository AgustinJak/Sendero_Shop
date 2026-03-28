"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { formatPrice } from "@/lib/utils";
import type { Producto } from "@/types";

interface ProductCardProps {
  producto: Producto;
  index?: number;
}

export default function ProductCard({ producto, index = 0 }: ProductCardProps) {
  const imagen = producto.imagenes?.sort((a, b) => a.orden - b.orden)[0];
  const tieneOferta = producto.precio_oferta && producto.precio_oferta < producto.precio;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        href={`/producto/${producto.slug}`}
        className="group block bg-navy-deep rounded-xl overflow-hidden border border-lavanda/10 hover:border-lavanda/30 transition-colors"
      >
        <div className="aspect-square relative bg-lavanda/5 overflow-hidden">
          {imagen ? (
            <Image
              src={imagen.url}
              alt={imagen.alt_text || producto.nombre}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-lavanda/30 text-sm">Sin imagen</span>
            </div>
          )}

          {tieneOferta && (
            <span className="absolute top-2 left-2 bg-ambar text-navy-deep text-xs font-bold px-2 py-1 rounded">
              OFERTA
            </span>
          )}

          {producto.destacado && !tieneOferta && (
            <span className="absolute top-2 left-2 bg-purpura text-niebla text-xs font-bold px-2 py-1 rounded">
              DESTACADO
            </span>
          )}
        </div>

        <div className="p-4">
          {producto.anime && (
            <p className="text-xs text-lavanda/60 mb-1 uppercase tracking-wider">
              {producto.anime}
            </p>
          )}

          <h3 className="text-sm font-medium text-niebla truncate group-hover:text-ambar-light transition-colors">
            {producto.nombre}
          </h3>

          <div className="mt-2 flex items-center gap-2">
            {tieneOferta ? (
              <>
                <span className="text-ambar font-bold">
                  {formatPrice(producto.precio_oferta!)}
                </span>
                <span className="text-lavanda/50 text-sm line-through">
                  {formatPrice(producto.precio)}
                </span>
              </>
            ) : (
              <span className="text-lavanda font-semibold">
                {formatPrice(producto.precio)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
