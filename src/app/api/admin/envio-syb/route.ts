import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { conRevalidacion } from "@/lib/revalidar";
import { esAdmin } from "@/lib/admin";

/** Guarda las zonas y precios del courier local. Solo admin. */
async function put(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!esAdmin(user)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { zonas } = await req.json();
  if (!Array.isArray(zonas)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const service = await createServiceRoleClient();

  for (const z of zonas) {
    const precio = Number(z.precio);
    // Un precio negativo o no numérico restaría del total del pedido.
    if (!Number.isFinite(precio) || precio < 0) {
      return NextResponse.json(
        { error: `Precio inválido en la zona "${z.nombre}"` },
        { status: 400 }
      );
    }

    const { error } = await service
      .from("envio_syb_zonas")
      .update({
        nombre: String(z.nombre || "").trim(),
        precio,
        zonas: Array.isArray(z.zonas) ? z.zonas : [],
        codigos_postales: String(z.codigos_postales || "").trim() || null,
        activo: Boolean(z.activo),
        updated_at: new Date().toISOString(),
      })
      .eq("id", z.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}

// Si responden bien, invalidan la caché de la tienda: ver lib/revalidar.ts.
export const PUT = conRevalidacion(put);
