import { createServiceRoleClient } from "@/lib/supabase-server";
import { notFound, redirect } from "next/navigation";
import type { PedidoBorrador } from "@/types";
import BorradorForm from "@/components/admin/BorradorForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarBorradorPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createServiceRoleClient();

  const { data } = await supabase
    .from("pedidos_borrador")
    .select("*")
    .eq("id", id)
    .single();

  if (!data) notFound();
  const b = data as PedidoBorrador;

  // Solo se puede editar contenido si está pendiente.
  // Si no, redirigir a la vista de detalle (el admin verá el motivo ahí).
  if (b.estado !== "pendiente") {
    redirect(`/admin/borradores/${id}`);
  }

  return <BorradorForm initialData={b} />;
}
