import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

/**
 * Agrega un item a una sección tomando los datos de un producto del catálogo.
 * Body: { producto_id: string }
 *
 * Snapshotea nombre, SKU, PVP e imagen principal del producto (así la lista
 * queda estable aunque el catálogo cambie). El precio mayorista (precio_ars)
 * arranca en null y lo carga el admin. La imagen se referencia por su URL
 * pública del bucket `productos` (storage_path=null → no se borra del bucket
 * de productos cuando se quita el item de la lista).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; seccionId: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { seccionId } = await params;
  const body = await req.json();
  const productoId = body.producto_id as string | undefined;
  if (!productoId) {
    return NextResponse.json({ error: "producto_id requerido" }, { status: 400 });
  }

  const db = await createServiceRoleClient();

  // Traer el producto + su imagen principal
  const { data: producto, error: prodErr } = await db
    .from("productos")
    .select("id, nombre, sku, precio, precio_oferta, imagenes:producto_imagenes(url, orden, tipo)")
    .eq("id", productoId)
    .single();

  if (prodErr || !producto) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const imagenPrincipal = (producto.imagenes as { url: string; orden: number; tipo?: string }[] | null)
    ?.filter((i) => i.tipo !== "video")
    ?.sort((a, b) => a.orden - b.orden)[0];

  const pvp = producto.precio_oferta ?? producto.precio;

  // Orden dentro de la sección
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
      producto_id: producto.id,
      titulo: producto.nombre,
      codigo_ref: producto.sku ?? "",
      precio_pvp: pvp,
      precio_ars: null,
      orden,
    })
    .select()
    .single();

  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });

  // Referenciar la imagen principal del producto (sin re-subir; es URL pública)
  if (imagenPrincipal?.url) {
    await db.from("mayorista_imagenes").insert({
      item_id: item.id,
      url: imagenPrincipal.url,
      storage_path: null,
      orden: 0,
    });
  }

  const { data: full } = await db
    .from("mayorista_items")
    .select("*, imagenes:mayorista_imagenes(*)")
    .eq("id", item.id)
    .single();

  return NextResponse.json(full, { status: 201 });
}
