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
              anime: formData.anime,
              personaje: formData.personaje,
              tamano: formData.tamano,
              descripcion: formData.descripcion,
              destacado: formData.destacado,
              stock_tipo: formData.stock_tipo,
              tiempo_produccion: formData.tiempo_produccion,
            }}
          />
        )}
        <p className="mt-3 text-xs text-lavanda/40 text-center">
          Las imágenes se agregan después de crear el producto
        </p>
      </div>
    </div>
  );
}
