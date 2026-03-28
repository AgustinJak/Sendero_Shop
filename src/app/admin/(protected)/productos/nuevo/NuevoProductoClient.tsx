"use client";

import { useState, useCallback } from "react";
import ProductoForm, { type ProductoFormData } from "@/components/admin/ProductoForm";
import ProductoPreview from "@/components/admin/ProductoPreview";
import type { Categoria } from "@/types";

export default function NuevoProductoClient({
  categorias,
}: {
  categorias: Categoria[];
}) {
  const [formData, setFormData] = useState<ProductoFormData | null>(null);

  const handleFormChange = useCallback((data: ProductoFormData) => {
    setFormData(data);
  }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <ProductoForm categorias={categorias} onFormChange={handleFormChange} />
      </div>
      <div>
        {formData && (
          <ProductoPreview
            data={{
              nombre: formData.nombre,
              precio: formData.precio,
              precio_oferta: formData.precio_oferta,
              linea: formData.linea,
              tamano: formData.tamano,
              descripcion: formData.descripcion,
              destacado: formData.destacado,
              stock_tipo: formData.stock_tipo,
              tiempo_produccion: formData.tiempo_produccion,
            }}
          />
        )}
        {/* Variant placeholder */}
        <div className="mt-4 bg-navy-deep/50 border border-lavanda/10 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla/40 uppercase tracking-wider">
              Variantes
            </h3>
          </div>
          <p className="text-xs text-lavanda/40 text-center py-3">
            Las variantes e imágenes se agregan después de crear el producto.
          </p>
        </div>
      </div>
    </div>
  );
}
