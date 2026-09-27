import { NextRequest, NextResponse } from "next/server";

/**
 * Avisos de la política de contenido en modo reporte (next.config.ts,
 * SHOP - Seguridad, punto 8).
 *
 * Cada navegador que carga algo que la política no lista manda un aviso acá.
 * Se dejan en el log de Vercel para ver qué habría bloqueado antes de ponerla
 * a bloquear de verdad. No se guarda nada en la base: es público y cualquiera
 * puede mandar avisos falsos, así que solo sirve como pista.
 *
 * Llegan en dos formatos: el viejo (`report-uri`, un objeto "csp-report") y
 * el de la Reporting API (`report-to`, una lista de reportes con `body`).
 */
export async function POST(req: NextRequest) {
  const texto = (await req.text()).slice(0, 20_000);
  try {
    const datos = JSON.parse(texto);
    const reportes: Record<string, unknown>[] = Array.isArray(datos)
      ? datos.map((r) => r?.body ?? r)
      : [datos?.["csp-report"] ?? datos];

    // Una línea por aviso, sin saltos: el texto lo manda cualquiera.
    const corto = (v: unknown, max: number) => String(v).replace(/\s+/g, " ").slice(0, max);
    for (const r of reportes.slice(0, 10)) {
      const directiva = r.effectiveDirective ?? r["effective-directive"] ?? r["violated-directive"];
      const bloqueado = r.blockedURL ?? r["blocked-uri"];
      const pagina = r.documentURL ?? r["document-uri"];
      console.warn(`[csp] ${corto(directiva, 40)} bloquearía ${corto(bloqueado, 200)} en ${corto(pagina, 200)}`);
    }
  } catch {
    // Cuerpo que no es JSON: se ignora.
  }
  return new NextResponse(null, { status: 204 });
}
