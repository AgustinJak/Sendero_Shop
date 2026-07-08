import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

const KIT_SELECT = `*, items:mayorista_kit_items(*, item:mayorista_items(*, imagenes:mayorista_imagenes(*)))`;

/**
 * Crear un kit en una lista.
 * Body: { nombre, descripcion?, descuento_extra_pct?, items: [{ item_id, cantidad }] }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: lista_id } = await params;
  const body = await req.json();
  const db = await createServiceRoleClient();

  const items: { item_id: string; cantidad: number }[] = Array.isArray(body.items)
    ? body.items.filter(
        (i: { item_id?: string; cantidad?: number }) =>
          typeof i.item_id === "string" && Number(i.cantidad) >= 1
      )
    : [];

  // Orden al final
  const { data: existing } = await db
    .from("mayorista_kits")
    .select("orden")
    .eq("lista_id", lista_id)
    .order("orden", { ascending: false })
    .limit(1);
  const orden = existing && existing.length > 0 ? existing[0].orden + 1 : 0;

  const { data: kit, error } = await db
    .from("mayorista_kits")
    .insert({
      lista_id,
      nombre: (body.nombre as string)?.trim() || "Kit",
      descripcion: (body.descripcion as string)?.trim() || null,
      descuento_extra_pct: Number(body.descuento_extra_pct) || 0,
      orden,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (items.length > 0) {
    const { error: itemsErr } = await db.from("mayorista_kit_items").insert(
      items.map((i) => ({ kit_id: kit.id, item_id: i.item_id, cantidad: Math.round(i.cantidad) }))
    );
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  const { data: full } = await db
    .from("mayorista_kits")
    .select(KIT_SELECT)
    .eq("id", kit.id)
    .single();

  return NextResponse.json(full, { status: 201 });
}
