import { createServiceRoleClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import ProductoForm from "@/components/admin/ProductoForm";
import ProductoImagenes from "@/components/admin/ProductoImagenes";
import { getCategoriasTree } from "@/lib/queries";
import type { Producto } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarProductoPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServiceRoleClient();

  const [{ data: producto }, categorias] = await Promise.all([
    supabase
      .from("productos")
      .select("*, imagenes:producto_imagenes(*), variante_grupos(*, opciones:variante_opciones(*))")
      .eq("id", id)
      .single(),
    getCategoriasTree(),
  ]);

  if (!producto) notFound();

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">
        Editar: {producto.nombre}
      </h1>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <ProductoForm producto={producto as Producto} categorias={categorias} />
        </div>
        <div>
          <ProductoImagenes
            productoId={producto.id}
            imagenes={producto.imagenes || []}
          />
        </div>
      </div>
    </div>
  );
}
