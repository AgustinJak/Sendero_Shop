import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

/**
 * Crear item manualmente con upload directo de imágenes.
 * Body: multipart/form-data con:
 *   - titulo: string
 *   - codigo_ref?: string
 *   - precio_ars?: number
 *   - files: File[] (input name "files", múltiples archivos)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; seccionId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { seccionId } = await params;
  const db = await createServiceRoleClient();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  }

  const titulo = (formData.get("titulo") as string | null)?.trim() || "Producto";
  const codigo_ref = (formData.get("codigo_ref") as string | null)?.trim() || "";
  const precioRaw = formData.get("precio_ars") as string | null;
  const precio_ars = precioRaw ? Number(precioRaw) : null;
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  // Max orden actual en la sección
  const { data: existing } = await db
    .from("mayorista_items")
    .select("orden")
    .eq("seccion_id", seccionId)
    .order("orden", { ascending: false })
    .limit(1);

  const orden = existing && existing.length > 0 ? existing[0].orden + 1 : 0;

  // Crear el item
  const { data: item, error: itemError } = await db
    .from("mayorista_items")
    .insert({ seccion_id: seccionId, titulo, codigo_ref, precio_ars, orden })
    .select()
    .single();

  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });

  // Subir archivos a Storage
  const savedImages: { url: string; storage_path: string; orden: number }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (file.size === 0) continue;

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const storagePath = `items/${item.id}/${i}.${ext}`;
    const buffer = await file.arrayBuffer();

    const { error: upError } = await db.storage
      .from("mayoristas")
      .upload(storagePath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: true,
      });

    if (upError) {
      console.error("[mayoristas/items/manual] upload error:", upError.message);
      continue;
    }

    const { data: urlData } = db.storage.from("mayoristas").getPublicUrl(storagePath);
    savedImages.push({ url: urlData.publicUrl, storage_path: storagePath, orden: i });
  }

  if (savedImages.length > 0) {
    await db.from("mayorista_imagenes").insert(
      savedImages.map((img) => ({ ...img, item_id: item.id }))
    );
  }

  // Devolver item completo con imágenes
  const { data: full } = await db
    .from("mayorista_items")
    .select("*, imagenes:mayorista_imagenes(*)")
    .eq("id", item.id)
    .single();

  return NextResponse.json(full, { status: 201 });
}
