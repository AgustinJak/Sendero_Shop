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
  const imagen = producto.imagenes?.filter((i) => i.tipo !== "video").sort((a, b) => a.orden - b.orden)[0];
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
        className="group block bg-navy-deep rounded-xl overflow-hidden border border-lavanda/10 hover:border-lavanda/30 transition-all duration-300 hover:shadow-lg hover:shadow-purpura/10 hover:-translate-y-1"
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
              <span className="text-lavanda/50 text-sm">Sin imagen</span>
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
          {producto.linea && (
            <p className="text-xs text-lavanda/75 mb-1 uppercase tracking-wider">
              {producto.linea}
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
                <span className="text-lavanda/70 text-sm line-through">
                  {formatPrice(producto.precio)}
                </span>
              </>
            ) : (
              <span className="text-lavanda font-semibold">
                {formatPrice(producto.precio)}
              </span>
            )}
          </div>

          {/* Social proof — desde la primera unidad vendida */}
          {producto.unidades_vendidas >= 1 && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-400/90">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3 h-3"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                {producto.unidades_vendidas >= 100
                  ? `+${Math.floor(producto.unidades_vendidas / 100) * 100}`
                  : producto.unidades_vendidas}{" "}
                {producto.unidades_vendidas === 1 ? "vendido" : "vendidos"}
              </span>
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
