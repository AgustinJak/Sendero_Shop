import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const serviceClient = await createServiceRoleClient();

  const { data, error } = await serviceClient
    .from("categorias")
    .insert({
      nombre: body.nombre,
      slug: body.slug,
      parent_id: body.parent_id || null,
      orden: body.orden ?? 0,
      activo: body.activo ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
