import { createServiceRoleClient } from "@/lib/supabase-server";
import CategoriasManager from "@/components/admin/CategoriasManager";
import type { Categoria } from "@/types";

export default async function CategoriasAdminPage() {
  const supabase = await createServiceRoleClient();

  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .order("orden", { ascending: true });

  // Build tree
  const all = (categorias || []) as Categoria[];
  const roots = all.filter((c) => !c.parent_id);
  const tree = roots.map((root) => ({
    ...root,
    children: all.filter((c) => c.parent_id === root.id),
  }));

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">
        Categorías
      </h1>
      <CategoriasManager categorias={tree} allCategorias={all} />
    </div>
  );
}
