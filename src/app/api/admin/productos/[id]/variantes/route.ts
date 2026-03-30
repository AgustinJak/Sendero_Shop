import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

interface OpcionInput {
  temp_key: string; // clave temporal para mapear reglas
  valor: string;
  precio_adicional: number;
  imagen_url: string | null;
  activo: boolean;
  orden: number;
}

interface GrupoInput {
  nombre: string;
  orden: number;
  opciones: OpcionInput[];
}

interface ReglaInput {
  opcion_key: string; // temp_key de la opción cuyo precio cambia
  cuando_opcion_key: string; // temp_key de la opción condición
  precio_adicional: number;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: productoId } = await params;
  const body = await req.json();
  const grupos: GrupoInput[] = body.grupos || [];
  const reglas: ReglaInput[] = body.reglas || [];

  const sc = await createServiceRoleClient();

  // Delete existing price rules for this product
  await sc.from("variante_precio_reglas").delete().eq("producto_id", productoId);

  // Delete all existing groups+options (cascade deletes opciones)
  const { error: delError } = await sc
    .from("variante_grupos")
    .delete()
    .eq("producto_id", productoId);

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 });
  }

  // Map temp_key → real UUID for price rules
  const keyToId: Record<string, string> = {};

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
      for (const op of grupo.opciones) {
        const { data: newOp, error: oError } = await sc
          .from("variante_opciones")
          .insert({
            grupo_id: newGrupo.id,
            valor: op.valor,
            precio_adicional: op.precio_adicional || 0,
            imagen_url: op.imagen_url || null,
            activo: op.activo ?? true,
            orden: op.orden,
          })
          .select("id")
          .single();

        if (oError || !newOp) {
          return NextResponse.json({ error: oError?.message || "Error al crear opción" }, { status: 500 });
        }

        keyToId[op.temp_key] = newOp.id;
      }
    }
  }

  // Insert price rules
  if (reglas.length > 0) {
    const reglasInsert = reglas
      .filter((r) => keyToId[r.opcion_key] && keyToId[r.cuando_opcion_key])
      .map((r) => ({
        producto_id: productoId,
        opcion_id: keyToId[r.opcion_key],
        cuando_opcion_id: keyToId[r.cuando_opcion_key],
        precio_adicional: r.precio_adicional,
      }));

    if (reglasInsert.length > 0) {
      const { error: rError } = await sc
        .from("variante_precio_reglas")
        .insert(reglasInsert);

      if (rError) {
        return NextResponse.json({ error: rError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
