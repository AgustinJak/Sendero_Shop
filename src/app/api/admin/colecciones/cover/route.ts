import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createServiceRoleClient, createServerSupabaseClient } from "@/lib/supabase-server";

const IMG_MAX_WIDTH = 1600;
const IMG_WEBP_QUALITY = 80;

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

  // Comprimir a WebP antes de subir para reducir egress
  let uploadBody: Buffer | File = file;
  let uploadContentType = file.type;
  let uploadExt = file.name.split(".").pop() || "jpg";

  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    let pipeline = sharp(inputBuffer, { failOn: "none" }).rotate();
    const meta = await pipeline.metadata();
    if (meta.width && meta.width > IMG_MAX_WIDTH) {
      pipeline = pipeline.resize({ width: IMG_MAX_WIDTH, withoutEnlargement: true });
    }
    uploadBody = await pipeline
      .webp({ quality: IMG_WEBP_QUALITY, effort: 5 })
      .toBuffer();
    uploadContentType = "image/webp";
    uploadExt = "webp";
  } catch (err) {
    console.error("[colecciones/cover] compresión falló, usando original:", (err as Error).message);
  }

  const fileName = `colecciones/${coleccionId}-${Date.now()}.${uploadExt}`;

  const { error: uploadError } = await supabase.storage
    .from("productos")
    .upload(fileName, uploadBody, {
      contentType: uploadContentType,
      cacheControl: "31536000",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("productos")
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
