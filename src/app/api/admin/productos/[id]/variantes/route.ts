import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: productoId } = await params;
  const body = await req.json();
  const grupos: {
    id?: string;
    nombre: string;
    orden: number;
    opciones: {
      id?: string;
      valor: string;
      precio_adicional: number;
      imagen_url: string | null;
      activo: boolean;
      orden: number;
    }[];
  }[] = body.grupos || [];

  const sc = await createServiceRoleClient();

  // Delete all existing groups+options for this product, then re-insert
  // (simplest approach — cascading delete handles opciones)
  const { error: delError } = await sc
    .from("variante_grupos")
    .delete()
    .eq("producto_id", productoId);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  // Insert groups and their options
  for (const grupo of grupos) {
    const { data: newGrupo, error: gError } = await sc
      .from("variante_grupos")
      .insert({
        producto_id: productoId,
        nombre: grupo.nombre,
        orden: grupo.orden,
      })
      .select("id")
      .single();

    if (gError || !newGrupo) {
      return NextResponse.json({ error: gError?.message || "Error al crear grupo" }, { status: 500 });
    }

    if (grupo.opciones.length > 0) {
      const opciones = grupo.opciones.map((op) => ({
        grupo_id: newGrupo.id,
        valor: op.valor,
        precio_adicional: op.precio_adicional || 0,
        imagen_url: op.imagen_url || null,
        activo: op.activo ?? true,
        orden: op.orden,
      }));

      const { error: oError } = await sc
        .from("variante_opciones")
        .insert(opciones);

      if (oError) {
        return NextResponse.json({ error: oError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
