"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/hooks/useCart";
import type { Producto, VarianteSeleccion } from "@/types";

interface AddToCartButtonProps {
  producto: Producto;
  selecciones: VarianteSeleccion[];
  precioFinal: number;
}

export default function AddToCartButton({
  producto,
  selecciones,
  precioFinal,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  // Verificar que todas las variantes requeridas estén seleccionadas
  const gruposRequeridos = producto.variante_grupos?.length || 0;
  const gruposSeleccionados = selecciones.length;
  const faltanVariantes = gruposRequeridos > 0 && gruposSeleccionados < gruposRequeridos;

  function handleAdd() {
    const imagen = producto.imagenes?.sort((a, b) => a.orden - b.orden)[0];

    addItem({
      producto_id: producto.id,
      nombre: producto.nombre,
      slug: producto.slug,
      imagen_url: imagen?.url || "",
      precio_base: producto.precio,
      opciones: selecciones,
      cantidad: 1,
      precio_unitario: precioFinal,
    });

    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <button
      onClick={handleAdd}
      disabled={faltanVariantes}
      className={`w-full py-3 px-6 rounded-lg font-semibold text-sm transition-colors relative overflow-hidden ${
        faltanVariantes
          ? "bg-lavanda/20 text-lavanda/40 cursor-not-allowed"
          : added
            ? "bg-green-600 text-white"
            : "bg-purpura hover:bg-purpura/80 text-niebla"
      }`}
    >
      <AnimatePresence mode="wait">
        {added ? (
          <motion.span
            key="added"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
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
          >
            Agregar al carrito
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
