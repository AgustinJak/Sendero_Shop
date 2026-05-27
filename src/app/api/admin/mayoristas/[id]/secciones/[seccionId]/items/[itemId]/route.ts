import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; seccionId: string; itemId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { itemId } = await params;
  const body = await req.json();
  const db = await createServiceRoleClient();

  const allowed = ["titulo", "codigo_ref", "precio_ars", "makerworld_url", "orden"];
  const update = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  const { data, error } = await db
    .from("mayorista_items")
    .update(update)
    .eq("id", itemId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; seccionId: string; itemId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { itemId } = await params;
  const db = await createServiceRoleClient();

  // Borrar imágenes del storage
  const { data: imgs } = await db
    .from("mayorista_imagenes")
    .select("storage_path")
    .eq("item_id", itemId);

  if (imgs && imgs.length > 0) {
    const paths = imgs.map((i) => i.storage_path).filter(Boolean) as string[];
    if (paths.length > 0) {
      await db.storage.from("mayoristas").remove(paths);
    }
  }

  const { error } = await db.from("mayorista_items").delete().eq("id", itemId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
