import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
// Video uploads disabled until further notice (Supabase Free plan 50MB/file limit)
// const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { fileName, fileType, fileSize, productoId } = await req.json();

  if (!fileName || !fileType || !fileSize || !productoId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
    return NextResponse.json(
      { error: "Formato no soportado. Usá JPG, PNG o WebP." },
      { status: 400 }
    );
  }

  if (fileSize > MAX_IMAGE_SIZE) {
    return NextResponse.json(
      { error: "El archivo excede el máximo de 10 MB" },
      { status: 400 }
    );
  }

  const ext = fileName.split(".").pop() || "jpg";
  const storagePath = `${productoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const tipo = "imagen";

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
