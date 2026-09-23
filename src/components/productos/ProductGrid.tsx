import type { Producto } from "@/types";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  productos: Producto[];
  /**
   * Si la grilla es lo primero que se ve (catálogo, colección), sus primeras
   * fotos se piden con prioridad porque suelen ser el LCP. En la home o en
   * relacionados van debajo de otra cosa y la prioridad le robaría ancho de
   * banda al banner.
   */
  prioridad?: boolean;
}

export default function ProductGrid({ productos, prioridad = false }: ProductGridProps) {
  if (productos.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-texto-3 text-lg">No se encontraron productos</p>
        <p className="text-texto-3 text-sm mt-2">
          Probá ajustando los filtros o explorá todo el catálogo
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {productos.map((producto, i) => (
        <ProductCard key={producto.id} producto={producto} index={i} prioridad={prioridad} />
      ))}
    </div>
  );
}
