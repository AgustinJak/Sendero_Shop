import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

async function downloadAndStore(
  db: Awaited<ReturnType<typeof createServiceRoleClient>>,
  imageUrl: string,
  storagePath: string
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SenderoShop/1.0)" },
    });
    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";

    const { error } = await db.storage
      .from("mayoristas")
      .upload(storagePath, buffer, { contentType, upsert: true });

    if (error) return null;

    const { data: urlData } = db.storage.from("mayoristas").getPublicUrl(storagePath);
    return urlData.publicUrl;
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; seccionId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { seccionId } = await params;
  const body = await req.json();
  const db = await createServiceRoleClient();

  // Max orden actual en la sección
  const { data: existing } = await db
    .from("mayorista_items")
    .select("orden")
    .eq("seccion_id", seccionId)
    .order("orden", { ascending: false })
    .limit(1);

  const orden = existing && existing.length > 0 ? existing[0].orden + 1 : 0;

  const { data: item, error: itemError } = await db
    .from("mayorista_items")
    .insert({
      seccion_id: seccionId,
      titulo: body.titulo || "Producto",
      codigo_ref: body.codigo_ref || "",
      precio_ars: body.precio_ars ?? null,
      makerworld_url: body.makerworld_url || null,
      orden,
    })
    .select()
    .single();

  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });

  // Descargar y guardar imágenes en Supabase Storage
  const imageUrls: string[] = body.imagenes || [];
  const savedImages: { url: string; storage_path: string; orden: number }[] = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const ext = imageUrls[i].split("?")[0].split(".").pop() || "jpg";
    const storagePath = `items/${item.id}/${i}.${ext}`;
    const publicUrl = await downloadAndStore(db, imageUrls[i], storagePath);
    if (publicUrl) {
      savedImages.push({ url: publicUrl, storage_path: storagePath, orden: i });
    }
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
