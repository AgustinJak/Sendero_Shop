import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { generarEtiquetaPDF } from "@/lib/etiqueta-envio";
import type { Pedido } from "@/types";

/**
 * Devuelve la etiqueta de envío del pedido como PDF descargable.
 *
 * El PDF se arma en el servidor y no en el navegador para no sumarle pdf-lib
 * al bundle del admin, que solo lo necesitaría para este botón.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // El proxy ya cubre /api/admin/*, pero el chequeo se repite acá por si
  // algún día cambia el matcher.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const service = await createServiceRoleClient();
  const { data: pedido, error } = await service
    .from("pedidos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !pedido) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  const pdf = await generarEtiquetaPDF(pedido as Pedido);

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="etiqueta-${pedido.numero_pedido}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
