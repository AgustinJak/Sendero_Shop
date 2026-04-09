import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { fileName, fileType, fileSize, productoId } = await req.json();

  if (!fileName || !fileType || !fileSize || !productoId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const isImage = ALLOWED_IMAGE_TYPES.includes(fileType);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(fileType);

  if (!isImage && !isVideo) {
    return NextResponse.json(
      { error: "Formato no soportado. Usá JPG, PNG, WebP, MP4 o WebM." },
      { status: 400 }
    );
  }

  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (fileSize > maxSize) {
    const maxMB = maxSize / (1024 * 1024);
    return NextResponse.json(
      { error: `El archivo excede el máximo de ${maxMB} MB` },
      { status: 400 }
    );
  }

  const ext = fileName.split(".").pop() || (isVideo ? "mp4" : "jpg");
  const storagePath = `${productoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const tipo = isVideo ? "video" : "imagen";

  const serviceClient = await createServiceRoleClient();

  const { data, error } = await serviceClient.storage
    .from("productos")
    .createSignedUploadUrl(storagePath);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: storagePath,
    tipo,
  });
}
