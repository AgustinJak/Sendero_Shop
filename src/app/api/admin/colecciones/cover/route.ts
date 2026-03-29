import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const coleccionId = formData.get("coleccion_id") as string | null;

  if (!file || !coleccionId) {
    return NextResponse.json({ error: "Archivo y coleccion_id requeridos" }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  // Upload to storage
  const ext = file.name.split(".").pop() || "jpg";
  const fileName = `colecciones/${coleccionId}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("imagenes")
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("imagenes")
    .getPublicUrl(fileName);

  // Update collection with cover URL
  const { error: updateError } = await supabase
    .from("colecciones")
    .update({ imagen_cover: urlData.publicUrl })
    .eq("id", coleccionId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ url: urlData.publicUrl });
}
