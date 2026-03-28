import { createServiceRoleClient } from "@/lib/supabase-server";
import ProductoForm from "@/components/admin/ProductoForm";
import { getCategoriasTree } from "@/lib/queries";

export default async function NuevoProductoPage() {
  const categorias = await getCategoriasTree();

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">
        Nuevo producto
      </h1>
      <ProductoForm categorias={categorias} />
    </div>
  );
}
