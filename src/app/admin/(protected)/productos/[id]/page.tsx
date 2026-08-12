import { createServiceRoleClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { getCategoriasTree } from "@/lib/queries";
import type { Producto } from "@/types";
import type { ProductoElegible } from "@/components/admin/KitComponentesManager";
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
      .select("*, imagenes:producto_imagenes(*), variante_grupos(*, opciones:variante_opciones(*)), precio_reglas:variante_precio_reglas(*), kit_componentes(*)")
      .eq("id", id)
      .single(),
    getCategoriasTree(),
  ]);

  if (!producto) notFound();

  // Candidatos a componente: solo si es un kit, para no pedir 55 productos
  // cada vez que se edita uno normal. Se excluyen los kits (no se anidan) y
  // el propio producto.
  let candidatos: ProductoElegible[] = [];
  if (producto.es_kit) {
    const { data: productos } = await supabase
      .from("productos")
      .select("id, nombre, precio, precio_oferta, imagenes:producto_imagenes(url, orden, tipo)")
      .eq("es_kit", false)
      .neq("id", id)
      .order("nombre");

    candidatos = (productos ?? []).map((p) => {
      const imagenes = (p.imagenes ?? []) as { url: string; orden: number; tipo: string }[];
      const portada = imagenes
        .filter((i) => i.tipo !== "video")
        .sort((a, b) => a.orden - b.orden)[0];
      return {
        id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        precio_oferta: p.precio_oferta,
        imagen_url: portada?.url ?? null,
      };
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">
        Editar: {producto.nombre}
      </h1>

      <EditarProductoClient
        producto={producto as Producto}
        categorias={categorias}
        candidatosKit={candidatos}
      />
    </div>
  );
}
