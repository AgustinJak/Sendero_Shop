import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { productoId, url, orden, tipo } = await req.json();

  if (!productoId || !url || tipo === undefined) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  const { data, error } = await serviceClient
    .from("producto_imagenes")
    .insert({
      producto_id: productoId,
      url,
      orden: orden ?? 0,
      alt_text: null,
      tipo,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
