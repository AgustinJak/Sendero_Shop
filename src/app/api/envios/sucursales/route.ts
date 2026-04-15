import { NextRequest, NextResponse } from "next/server";
import { listarSucursales, PROVINCIA_A_CODIGO } from "@/lib/correo-argentino";

export async function GET(req: NextRequest) {
  try {
    const provincia = req.nextUrl.searchParams.get("provincia");
    const cpCliente = req.nextUrl.searchParams.get("cp");

    if (!provincia) {
      return NextResponse.json(
        { error: "Falta el parámetro provincia" },
        { status: 400 }
      );
    }

    const code = PROVINCIA_A_CODIGO[provincia];
    if (!code) {
      return NextResponse.json(
        { error: `Provincia no reconocida: ${provincia}` },
        { status: 400 }
      );
    }

    const agencies = await listarSucursales(code);

    // Map to simplified list
    let sucursales = agencies.map((a) => ({
      id: a.agencyId,
      nombre: a.agencyName,
      direccion: a.address,
      ciudad: a.city,
      codigoPostal: a.postalCode,
      telefono: a.phone,
      horario: a.schedule,
      lat: a.latitude,
      lng: a.longitude,
    }));

    // Sort by proximity to client CP
    if (cpCliente) {
      const cpNum = parseInt(cpCliente.match(/\d{4}/)?.[0] || "0", 10);
      if (cpNum > 0) {
        sucursales = sucursales.sort((a, b) => {
          const distA = minCPDistance(a.codigoPostal, cpNum);
          const distB = minCPDistance(b.codigoPostal, cpNum);
          return distA - distB;
        });
      }
    }

    return NextResponse.json({ sucursales });
  } catch (err) {
    console.error("Error listando sucursales:", err);
    return NextResponse.json(
      { error: "No se pudieron obtener las sucursales. Intentá de nuevo." },
      { status: 500 }
    );
  }
}

/**
 * Calculate the minimum numeric distance between a client CP
 * and a sucursal's CP list (comma-separated string like "1019,1031,1033").
 */
function minCPDistance(sucursalCPs: string, clienteCP: number): number {
  if (!sucursalCPs) return Infinity;
  const cps = sucursalCPs.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
  if (cps.length === 0) return Infinity;
  return Math.min(...cps.map((cp) => Math.abs(cp - clienteCP)));
}
