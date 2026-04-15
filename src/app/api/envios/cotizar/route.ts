import { NextRequest, NextResponse } from "next/server";
import { cotizar } from "@/lib/correo-argentino";

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

    const result = await cotizar(match[0], paquete);

    return NextResponse.json({
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
