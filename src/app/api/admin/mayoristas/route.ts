import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const db = await createServiceRoleClient();
  const { data, error } = await db
    .from("mayorista_listas")
    .select("*, secciones:mayorista_secciones(id)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  if (!body.nombre || !body.codigo) {
    return NextResponse.json({ error: "nombre y codigo son requeridos" }, { status: 400 });
  }

  const db = await createServiceRoleClient();
  const { data, error } = await db
    .from("mayorista_listas")
    .insert({ nombre: body.nombre, codigo: body.codigo.toLowerCase().trim(), activa: body.activa ?? true })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
