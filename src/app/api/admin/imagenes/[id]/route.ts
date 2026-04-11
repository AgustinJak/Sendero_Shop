import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const { opcion_id } = await req.json();
  const serviceClient = await createServiceRoleClient();

  const { error } = await serviceClient
    .from("producto_imagenes")
    .update({ opcion_id: opcion_id || null })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  // Get image record to find storage path
  const { data: imagen } = await serviceClient
    .from("producto_imagenes")
    .select("url")
    .eq("id", id)
    .single();

  if (imagen?.url) {
    // Extract storage path from public URL
    const urlParts = imagen.url.split("/storage/v1/object/public/productos/");
    if (urlParts[1]) {
      await serviceClient.storage.from("productos").remove([urlParts[1]]);
    }
  }

  const { error } = await serviceClient
    .from("producto_imagenes")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
