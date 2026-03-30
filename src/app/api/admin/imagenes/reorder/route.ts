import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

// PATCH /api/admin/imagenes/reorder — update image order
export async function PATCH(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { orden }: { orden: { id: string; orden: number }[] } = await req.json();

  if (!orden || !Array.isArray(orden)) {
    return NextResponse.json({ error: "orden requerido" }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  for (const item of orden) {
    await serviceClient
      .from("producto_imagenes")
      .update({ orden: item.orden })
      .eq("id", item.id);
  }

  return NextResponse.json({ ok: true });
}
