import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { conRevalidacion } from "@/lib/revalidar";
import { esAdmin } from "@/lib/admin";

async function post(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!esAdmin(user)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: lista_id } = await params;
  const body = await req.json();
  const db = await createServiceRoleClient();

  // Max orden actual
  const { data: existing } = await db
    .from("mayorista_secciones")
    .select("orden")
    .eq("lista_id", lista_id)
    .order("orden", { ascending: false })
    .limit(1);

  const orden = existing && existing.length > 0 ? existing[0].orden + 1 : 0;

  const { data, error } = await db
    .from("mayorista_secciones")
    .insert({ lista_id, titulo: body.titulo || "Nueva sección", orden })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// Si responden bien, invalidan la caché de la tienda: ver lib/revalidar.ts.
export const POST = conRevalidacion(post);
