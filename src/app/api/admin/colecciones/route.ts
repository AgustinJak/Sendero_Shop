import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { conRevalidacion } from "@/lib/revalidar";
import { esAdmin } from "@/lib/admin";

export async function GET() {
  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from("colecciones")
    .select("*, coleccion_productos(producto_id)")
    .order("orden", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

async function post(req: NextRequest) {
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!esAdmin(user)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();
  const supabase = await createServiceRoleClient();

  const { producto_ids, ...coleccionData } = body;

  const { data, error } = await supabase
    .from("colecciones")
    .insert(coleccionData)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert product associations for manual collections
  if (producto_ids?.length && coleccionData.tipo === "manual") {
    const rows = producto_ids.map((pid: string, i: number) => ({
      coleccion_id: data.id,
      producto_id: pid,
      orden: i,
    }));
    await supabase.from("coleccion_productos").insert(rows);
  }

  return NextResponse.json(data, { status: 201 });
}

// Si responden bien, invalidan la caché de la tienda: ver lib/revalidar.ts.
export const POST = conRevalidacion(post);
