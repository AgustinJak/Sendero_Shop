import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

const KIT_SELECT = `*, items:mayorista_kit_items(*, item:mayorista_items(*, imagenes:mayorista_imagenes(*)))`;

/**
 * Actualizar un kit.
 * Body: { nombre?, descripcion?, descuento_extra_pct?, orden?, items? }
 * Si viene `items` ([{ item_id, cantidad }]), reemplaza TODOS los items del kit.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; kitId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { kitId } = await params;
  const body = await req.json();
  const db = await createServiceRoleClient();

  const allowed = ["nombre", "descripcion", "descuento_extra_pct", "orden"];
  const update = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  if (Object.keys(update).length > 0) {
    const { error } = await db
      .from("mayorista_kits")
      .update(update)
      .eq("id", kitId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Reemplazo total de items si vienen
  if (Array.isArray(body.items)) {
    const items = body.items.filter(
      (i: { item_id?: string; cantidad?: number }) =>
        typeof i.item_id === "string" && Number(i.cantidad) >= 1
    );
    const { error: delErr } = await db
      .from("mayorista_kit_items")
      .delete()
      .eq("kit_id", kitId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    if (items.length > 0) {
      const { error: insErr } = await db.from("mayorista_kit_items").insert(
        items.map((i: { item_id: string; cantidad: number }) => ({
          kit_id: kitId,
          item_id: i.item_id,
          cantidad: Math.round(i.cantidad),
        }))
      );
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  const { data: full, error: getErr } = await db
    .from("mayorista_kits")
    .select(KIT_SELECT)
    .eq("id", kitId)
    .single();

  if (getErr) return NextResponse.json({ error: getErr.message }, { status: 500 });
  return NextResponse.json(full);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; kitId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { kitId } = await params;
  const db = await createServiceRoleClient();

  const { error } = await db.from("mayorista_kits").delete().eq("id", kitId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
