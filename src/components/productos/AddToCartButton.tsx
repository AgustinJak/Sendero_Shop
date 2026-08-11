"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartContext } from "@/components/carrito/CartProvider";
import type { Producto, VarianteSeleccion } from "@/types";

interface AddToCartButtonProps {
  producto: Producto;
  selecciones: VarianteSeleccion[];
  precioFinal: number;
  cantidad?: number;
  /** Se llama después de agregar, para resetear el selector de cantidad. */
  onAdded?: () => void;
}

export default function AddToCartButton({
  producto,
  selecciones,
  precioFinal,
  cantidad = 1,
  onAdded,
}: AddToCartButtonProps) {
  const { addItem } = useCartContext();
  const [added, setAdded] = useState(false);

  // Verificar que todas las variantes requeridas estén seleccionadas
  const gruposRequeridos = producto.variante_grupos?.length || 0;
  const gruposSeleccionados = selecciones.length;
  const faltanVariantes = gruposRequeridos > 0 && gruposSeleccionados < gruposRequeridos;

  function handleAdd() {
    const imagen = producto.imagenes?.filter((i) => i.tipo !== "video").sort((a, b) => a.orden - b.orden)[0];

    addItem({
      producto_id: producto.id,
      nombre: producto.nombre,
      slug: producto.slug,
      imagen_url: imagen?.url || "",
      precio_base: producto.precio,
      opciones: selecciones,
      cantidad,
      precio_unitario: precioFinal,
      peso_gr: producto.peso_gr,
      alto_cm: producto.alto_cm,
      ancho_cm: producto.ancho_cm,
      largo_cm: producto.largo_cm,
    });

    onAdded?.();
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <button
      onClick={handleAdd}
      disabled={faltanVariantes}
      className={`w-full py-3 px-6 rounded-lg font-semibold text-sm transition-colors relative overflow-hidden ${
        faltanVariantes
          ? "bg-lavanda/20 text-lavanda/60 cursor-not-allowed"
          : added
            ? "bg-green-600 text-white cursor-default"
            : "bg-purpura hover:bg-purpura/80 text-niebla cursor-pointer"
      }`}
    >
      <AnimatePresence mode="wait">
        {added ? (
          <motion.span
            key="added"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Agregado al carrito
          </motion.span>
        ) : faltanVariantes ? (
          <span>Seleccioná las opciones</span>
        ) : (
          <motion.span
            key="add"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
            Agregar al carrito
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
