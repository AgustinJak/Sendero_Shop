import { createServiceRoleClient } from "@/lib/supabase-server";
import ColeccionesManager from "@/components/admin/ColeccionesManager";

export default async function ColeccionesAdminPage() {
  const supabase = await createServiceRoleClient();

  const [{ data: colecciones }, { data: productos }] = await Promise.all([
    supabase
      .from("colecciones")
      .select("*, coleccion_productos(producto_id)")
      .order("orden", { ascending: true }),
    supabase
      .from("productos")
      .select("id, nombre, slug")
      .eq("activo", true)
      .order("nombre"),
  ]);

  return (
    <div>
      <h1 className="font-[family-name:var(--font-cinzel)] text-2xl font-bold text-niebla mb-6">
        Colecciones
      </h1>
      <ColeccionesManager
        colecciones={colecciones || []}
        productos={productos || []}
      />
    </div>
  );
}
