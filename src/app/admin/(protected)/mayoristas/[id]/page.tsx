import { createServiceRoleClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import MayoristaEditor from "@/components/admin/MayoristaEditor";

export default async function MayoristaEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await createServiceRoleClient();

  const { data: lista } = await db
    .from("mayorista_listas")
    .select(`
      *,
      secciones:mayorista_secciones(
        *,
        items:mayorista_items(
          *,
          imagenes:mayorista_imagenes(*)
        )
      )
    `)
    .eq("id", id)
    .single();

  if (!lista) notFound();

  // Ordenar secciones e items
  const listaOrdenada = {
    ...lista,
    secciones: (lista.secciones ?? [])
      .sort((a: { orden: number }, b: { orden: number }) => a.orden - b.orden)
      .map((s: { items?: { orden: number }[]; [key: string]: unknown }) => ({
        ...s,
        items: (s.items ?? []).sort((a: { orden: number }, b: { orden: number }) => a.orden - b.orden),
      })),
  };

  return <MayoristaEditor lista={listaOrdenada} />;
}
