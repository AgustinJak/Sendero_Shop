import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { CACHE_UN_ANIO, generarVersiones } from "@/lib/imagenes";
import { conRevalidacion } from "@/lib/revalidar";
import { esAdmin } from "@/lib/admin";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

// La compresión vive en lib/imagenes.ts, compartida con register (la subida
// que usa el panel hoy) y con el reproceso de imágenes viejas.

async function post(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!esAdmin(user)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

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

  const base = `${productoId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const storage = serviceClient.storage.from("productos");

  let url: string;
  let urlThumb: string | null = null;

  const subir = async (ruta: string, cuerpo: Buffer | File, contentType: string) => {
    const { error } = await storage.upload(ruta, cuerpo, { contentType, cacheControl: CACHE_UN_ANIO });
    if (error) throw new Error(error.message);
    return storage.getPublicUrl(ruta).data.publicUrl;
  };

  try {
    if (isImage) {
      let versiones: Awaited<ReturnType<typeof generarVersiones>> | null = null;
      try {
        versiones = await generarVersiones(Buffer.from(await file.arrayBuffer()));
      } catch (err) {
        // Si sharp no puede con el formato, se sube el original.
        console.error("[imagenes] compresión falló, usando original:", (err as Error).message);
      }
      if (versiones) {
        url = await subir(`${base}.webp`, versiones.principal, "image/webp");
        urlThumb = await subir(`${base}-thumb.webp`, versiones.miniatura, "image/webp");
      } else {
        url = await subir(`${base}.${file.name.split(".").pop() || "jpg"}`, file, file.type);
      }
    } else {
      url = await subir(`${base}.${file.name.split(".").pop() || "mp4"}`, file, file.type);
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  // Insert record
  const { data, error } = await serviceClient
    .from("producto_imagenes")
    .insert({
      producto_id: productoId,
      url,
      url_thumb: urlThumb,
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

// Si responden bien, invalidan la caché de la tienda: ver lib/revalidar.ts.
export const POST = conRevalidacion(post);
