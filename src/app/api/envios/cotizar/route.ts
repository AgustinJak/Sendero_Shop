import { NextRequest, NextResponse } from "next/server";
import { cotizar } from "@/lib/correo-argentino";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { buscarZonaSybPorCP, type ZonaSyb } from "@/lib/envio-syb";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { codigoPostal, paquete } = body as {
      codigoPostal?: string;
      paquete?: { weight?: number; height?: number; width?: number; length?: number };
    };

    if (!codigoPostal || codigoPostal.trim().length < 4) {
      return NextResponse.json(
        { error: "Código postal inválido" },
        { status: 400 }
      );
    }

    // Extract 4 numeric digits from CP (handles "1425" and "C1425CLA")
    const match = codigoPostal.trim().match(/\d{4}/);
    if (!match) {
      return NextResponse.json(
        { error: "Código postal inválido" },
        { status: 400 }
      );
    }

    // El courier local se resuelve por CP, que es lo único que hay acá. Se
    // consulta en paralelo con Correo: son independientes y una falla del
    // courier no tiene por qué tirar abajo la cotización de Correo.
    const [result, zonaSyb] = await Promise.all([
      cotizar(match[0], paquete),
      (async () => {
        try {
          const supabase = await createServerSupabaseClient();
          const { data } = await supabase
            .from("envio_syb_zonas")
            .select("*")
            .eq("activo", true)
            .order("orden");
          return buscarZonaSybPorCP(match[0], (data ?? []) as ZonaSyb[]);
        } catch {
          return null;
        }
      })(),
    ]);

    return NextResponse.json({
      syb: zonaSyb
        ? { precio: Number(zonaSyb.precio), zona: zonaSyb.nombre }
        : null,
      domicilio: result.domicilio
        ? {
            precio: result.domicilio.price,
            producto: result.domicilio.productName,
            tiempoMin: result.domicilio.deliveryTimeMin,
            tiempoMax: result.domicilio.deliveryTimeMax,
          }
        : null,
      sucursal: result.sucursal
        ? {
            precio: result.sucursal.price,
            producto: result.sucursal.productName,
            tiempoMin: result.sucursal.deliveryTimeMin,
            tiempoMax: result.sucursal.deliveryTimeMax,
          }
        : null,
    });
  } catch (err) {
    console.error("Error cotizando envío:", err);
    return NextResponse.json(
      { error: "No se pudo cotizar el envío. Intentá de nuevo." },
      { status: 500 }
    );
  }
}
