import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { normalizarSku, skuEnUso } from "@/lib/sku";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json();

  // El SKU lo genera el inventario y acá se carga a mano, así que hay que
  // validar unicidad: antes venía autogenerado y no podía repetirse.
  const sku = normalizarSku(body.sku);
  if (sku) {
    const enUso = await skuEnUso(sku);
    if (enUso) {
      return NextResponse.json(
        { error: `El SKU ${sku} ya lo usa "${enUso}"` },
        { status: 409 }
      );
    }
  }

  const serviceClient = await createServiceRoleClient();
  const { data, error } = await serviceClient
    .from("productos")
    .insert({
      nombre: body.nombre,
      slug: body.slug,
      descripcion: body.descripcion || "",
      precio: body.precio,
      precio_oferta: body.precio_oferta || null,
      categoria_id: body.categoria_id || null,
      activo: body.activo ?? true,
      destacado: body.destacado ?? false,
      stock_tipo: body.stock_tipo || "print-on-demand",
      tiempo_produccion: body.tiempo_produccion || 7,
      linea: body.linea || null,
      tamano: body.tamano || null,
      peso_gr: body.peso_gr || null,
      alto_cm: body.alto_cm || null,
      ancho_cm: body.ancho_cm || null,
      largo_cm: body.largo_cm || null,
      sku,
      meta_title: body.meta_title || null,
      meta_description: body.meta_description || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
