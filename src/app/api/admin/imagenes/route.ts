import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

// Compresión — mantener consistente con /optimizar-bucket
const IMG_MAX_WIDTH = 1600;
const IMG_WEBP_QUALITY = 80;

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

  // Determine media type
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: "Formato no soportado. Usá JPG, PNG, WebP, MP4 o WebM." },
      { status: 400 }
    );
  }

  // Validate file size
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    return NextResponse.json(
      { error: `El archivo excede el máximo de ${maxMB} MB` },
      { status: 400 }
    );
  }

  const tipo = isVideo ? "video" : "imagen";
  const serviceClient = await createServiceRoleClient();

  // Preparar buffer + metadatos según sea imagen o video
  let uploadBody: Buffer | File = file;
  let uploadContentType = file.type;
  let uploadExt = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");

  if (isImage) {
    // Comprimir a WebP 1600px Q80 ANTES de subir.
    // Esto reduce el egress de Supabase significativamente (PNGs 2MB → WebP ~200KB).
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
      // Si sharp falla (p.ej. formato raro), subir el original como fallback
      console.error("[imagenes] compresión falló, usando original:", (err as Error).message);
    }
  }

  // Upload to Supabase Storage
  const fileName = `${productoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${uploadExt}`;

  const { error: uploadError } = await serviceClient.storage
    .from("productos")
    .upload(fileName, uploadBody, {
      contentType: uploadContentType,
      cacheControl: "31536000",
    });

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
      tipo,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
