"use client";

import { useState, useCallback } from "react";
import ProductoForm, { type ProductoFormData } from "@/components/admin/ProductoForm";
import ProductoImagenes from "@/components/admin/ProductoImagenes";
import ProductoPreview from "@/components/admin/ProductoPreview";
import VariantesManager from "@/components/admin/VariantesManager";
import KitComponentesManager, {
  type ProductoElegible,
} from "@/components/admin/KitComponentesManager";
import type { Producto } from "@/types";
import type { Categoria } from "@/types";

export default function EditarProductoClient({
  producto,
  categorias,
  candidatosKit = [],
}: {
  producto: Producto;
  categorias: Categoria[];
  candidatosKit?: ProductoElegible[];
}) {
  const [formData, setFormData] = useState<ProductoFormData | null>(null);

  const handleFormChange = useCallback((data: ProductoFormData) => {
    setFormData(data);
  }, []);

  const primeraImagen = producto.imagenes
    ?.sort((a, b) => a.orden - b.orden)[0]
    ?.url;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2">
        <ProductoForm
          producto={producto}
          categorias={categorias}
          onFormChange={handleFormChange}
        />
      </div>
      <div className="space-y-4">
        <ProductoImagenes
          productoId={producto.id}
          imagenes={producto.imagenes || []}
          varianteGrupos={producto.variante_grupos || []}
        />
        {producto.es_kit && (
          <KitComponentesManager
            kitId={producto.id}
            precioKit={producto.precio_oferta || producto.precio}
            componentes={producto.kit_componentes || []}
            candidatos={candidatosKit}
          />
        )}
        <VariantesManager
          productoId={producto.id}
          grupos={producto.variante_grupos || []}
          precioReglas={producto.precio_reglas || []}
        />
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
              imagenUrl: primeraImagen,
            }}
          />
        )}
      </div>
    </div>
  );
}
