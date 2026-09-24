import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { generarEtiquetaPDF } from "@/lib/etiqueta-envio";
import { etiquetaZPL, nombreArchivoZPL } from "@/lib/etiqueta-zpl";
import type { Pedido } from "@/types";
import { esAdmin } from "@/lib/admin";

/**
 * Devuelve la etiqueta de envío del pedido, en PDF o en ZPL.
 *
 * `?formato=zpl` devuelve el ZPL para la impresora térmica; sin el parámetro
 * sigue saliendo el PDF de siempre, que es lo que espera quien imprime en una
 * impresora común.
 *
 * Los dos se arman en el servidor y no en el navegador para no sumarle pdf-lib
 * al bundle del admin, que solo lo necesitaría para este botón.
 *
 * El contenido **no se loguea**: la etiqueta lleva nombre, dirección y
 * teléfono del comprador.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // El proxy ya cubre /api/admin/*, pero el chequeo se repite acá por si
  // algún día cambia el matcher.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!esAdmin(user)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const service = await createServiceRoleClient();
  const { data: pedido, error } = await service
    .from("pedidos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !pedido) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  const p = pedido as Pedido;

  if (req.nextUrl.searchParams.get("formato") === "zpl") {
    // `?bajar=<mm>` corre el diseño hacia abajo dentro del rollo, para dejar
    // libre el troquel superior de las etiquetas de 10 × 20. Es un parámetro y
    // no una constante para poder calibrarlo imprimiendo, sin un deploy por
    // cada milímetro.
    //
    // Se acota a 0–50 mm: el diseño mide 14,6 cm, así que bajarlo 5 cm ya lo
    // deja terminando en 19,6 de los 20 disponibles. Más que eso se sale del
    // rollo y la impresora recorta.
    const bajarRaw = Number(req.nextUrl.searchParams.get("bajar"));
    const desplazarMm =
      req.nextUrl.searchParams.has("bajar") && Number.isFinite(bajarRaw)
        ? Math.min(Math.max(bajarRaw, 0), 50)
        : undefined;

    // UTF-8 explícito: el ZPL declara ^CI28 y los acentos tienen que llegar
    // así hasta la impresora.
    return new NextResponse(etiquetaZPL(p, { desplazarMm }), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nombreArchivoZPL(p)}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const pdf = await generarEtiquetaPDF(p);

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="etiqueta-${p.numero_pedido}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
