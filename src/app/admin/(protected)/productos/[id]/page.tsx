import { createServiceRoleClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { getCategoriasTree } from "@/lib/queries";
import type { Producto } from "@/types";
import EditarProductoClient from "./EditarProductoClient";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarProductoPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServiceRoleClient();

  const [{ data: producto }, categorias] = await Promise.all([
    supabase
      .from("productos")
      .select("*, imagenes:producto_imagenes(*), variante_grupos(*, opciones:variante_opciones(*)), precio_reglas:variante_precio_reglas(*)")
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

      <EditarProductoClient
        producto={producto as Producto}
        categorias={categorias}
      />
    </div>
  );
}
