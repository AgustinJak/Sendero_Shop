import { createServiceRoleClient } from "@/lib/supabase-server";
import ColeccionesManager from "@/components/admin/ColeccionesManager";

export default async function ColeccionesAdminPage() {
  const supabase = await createServiceRoleClient();

  const [{ data: colecciones }, { data: productos }, { data: allProductos }] =
    await Promise.all([
      supabase
        .from("colecciones")
        .select("*, coleccion_productos(producto_id)")
        .order("orden", { ascending: true }),
      supabase
        .from("productos")
        .select("id, nombre, slug")
        .eq("activo", true)
        .order("nombre"),
      supabase
        .from("productos")
        .select("id, linea, categoria_id, tamano")
        .eq("activo", true),
    ]);

  // Fetch all categories for slug→id mapping
  const { data: categorias } = await supabase
    .from("categorias")
    .select("id, slug");

  const catSlugToId = new Map(
    (categorias || []).map((c: { id: string; slug: string }) => [c.slug, c.id])
  );

  // For automatic collections, compute matching product count
  const coleccionesWithCount = (colecciones || []).map((col) => {
    if (col.tipo === "automatica" && col.regla && allProductos) {
      const matching = allProductos.filter((p) => {
        if (col.regla.linea && p.linea?.toLowerCase() !== col.regla.linea.toLowerCase()) return false;
        if (col.regla.categoria_slug || col.regla.categoria) {
          const catSlug = col.regla.categoria_slug || col.regla.categoria;
          const catId = catSlugToId.get(catSlug);
          if (catId && p.categoria_id !== catId) return false;
        }
        if (col.regla.tamano && p.tamano !== col.regla.tamano) return false;
        return true;
      });
      return { ...col, _auto_count: matching.length };
    }
    return { ...col, _auto_count: null };
  });

  return (
    <div>
      <h1 className="font-[family-name:var(--font-cinzel)] text-2xl font-bold text-niebla mb-6">
        Colecciones
      </h1>
      <ColeccionesManager
        colecciones={coleccionesWithCount}
        productos={productos || []}
      />
    </div>
  );
}
