import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { normalizarSku, skuEnUso } from "@/lib/sku";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowedFields = [
    "nombre", "slug", "descripcion", "precio", "precio_oferta",
    "categoria_id", "activo", "destacado", "stock_tipo", "tiempo_produccion",
    "linea", "tamano", "peso_gr", "alto_cm", "ancho_cm", "largo_cm", "sku",
    "meta_title", "meta_description",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  // El SKU se carga a mano desde el 2026-08-26 (lo genera el inventario), así
  // que se normaliza a mayúsculas y se valida que no lo tenga otro producto.
  // Se excluye el propio id para que guardar sin cambiarlo no choque consigo.
  if ("sku" in updates) {
    const sku = normalizarSku(updates.sku);
    if (sku) {
      const enUso = await skuEnUso(sku, id);
      if (enUso) {
        return NextResponse.json(
          { error: `El SKU ${sku} ya lo usa "${enUso}"` },
          { status: 409 }
        );
      }
    }
    updates.sku = sku;
  }

  const serviceClient = await createServiceRoleClient();
  const { error } = await serviceClient
    .from("productos")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  const { error } = await serviceClient
    .from("productos")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
