import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { generateToken } from "@/lib/borrador";
import type { PedidoBorrador } from "@/types";

/**
 * Genera un nuevo token para el borrador y lo devuelve.
 * El link viejo deja de funcionar inmediatamente.
 *
 *   POST /api/admin/borradores/[id]/regenerar-token
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const service = await createServiceRoleClient();

  const { data: actual } = await service
    .from("pedidos_borrador")
    .select("estado")
    .eq("id", id)
    .single<Pick<PedidoBorrador, "estado">>();
  if (!actual) {
    return NextResponse.json({ error: "Borrador no encontrado" }, { status: 404 });
  }

  if (actual.estado !== "pendiente") {
    return NextResponse.json(
      {
        error: `No se puede regenerar el token de un borrador en estado '${actual.estado}'`,
      },
      { status: 400 }
    );
  }

  const nuevoToken = generateToken();
  const { error } = await service
    .from("pedidos_borrador")
    .update({ token: nuevoToken })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ token: nuevoToken });
}
