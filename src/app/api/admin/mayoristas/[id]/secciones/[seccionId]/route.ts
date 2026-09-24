import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { conRevalidacion } from "@/lib/revalidar";
import { esAdmin } from "@/lib/admin";

async function patch(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; seccionId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!esAdmin(user)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { seccionId } = await params;
  const body = await req.json();
  const db = await createServiceRoleClient();

  const { data, error } = await db
    .from("mayorista_secciones")
    .update(body)
    .eq("id", seccionId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

async function del(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; seccionId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!esAdmin(user)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { seccionId } = await params;
  const db = await createServiceRoleClient();

  const { error } = await db.from("mayorista_secciones").delete().eq("id", seccionId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// Si responden bien, invalidan la caché de la tienda: ver lib/revalidar.ts.
export const PATCH = conRevalidacion(patch);
export const DELETE = conRevalidacion(del);
