import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createServerSupabaseClient } from "@/lib/supabase-server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const supabase = await createServiceRoleClient();

  const { producto_ids, ...coleccionData } = body;

  const { data, error } = await supabase
    .from("colecciones")
    .update(coleccionData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update product associations if provided
  if (producto_ids !== undefined) {
    await supabase.from("coleccion_productos").delete().eq("coleccion_id", id);
    if (producto_ids.length > 0) {
      const rows = producto_ids.map((pid: string, i: number) => ({
        coleccion_id: id,
        producto_id: pid,
        orden: i,
      }));
      await supabase.from("coleccion_productos").insert(rows);
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const supabase = await createServiceRoleClient();

  const { error } = await supabase.from("colecciones").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
