import { createServiceRoleClient } from "@/lib/supabase-server";
import Link from "next/link";
import MayoristaListaAdmin from "@/components/admin/MayoristaListaAdmin";

export default async function MayoristasAdminPage() {
  const db = await createServiceRoleClient();
  const { data: listas } = await db
    .from("mayorista_listas")
    .select("*, secciones:mayorista_secciones(id)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">
          Listas Mayoristas
        </h1>
        <Link
          href="/admin/mayoristas/nueva"
          className="px-4 py-2 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-medium rounded-lg transition-colors"
        >
          + Nueva lista
        </Link>
      </div>

      <MayoristaListaAdmin listas={listas ?? []} />
    </div>
  );
}
