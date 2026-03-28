import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const productoId = formData.get("producto_id") as string;
  const orden = Number(formData.get("orden") || 0);

  if (!file || !productoId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Upload to Supabase Storage
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `${productoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await serviceClient.storage
    .from("productos")
    .upload(fileName, file, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = serviceClient.storage
    .from("productos")
    .getPublicUrl(fileName);

  // Insert record
  const { data, error } = await serviceClient
    .from("producto_imagenes")
    .insert({
      producto_id: productoId,
      url: publicUrl,
      orden,
      alt_text: null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
