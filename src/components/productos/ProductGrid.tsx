import type { Producto } from "@/types";
import ProductCard from "./ProductCard";

interface ProductGridProps {
  productos: Producto[];
}

export default function ProductGrid({ productos }: ProductGridProps) {
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
        <ProductCard key={producto.id} producto={producto} index={i} />
      ))}
    </div>
  );
}
