import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { reprocesarPendientes } from "@/lib/imagenes";
import { revalidarTienda } from "@/lib/revalidar";
import { esAdmin } from "@/lib/admin";

/**
 * Procesa a mano las fotos que todavía no tienen versión optimizada.
 *
 * Desde el 2026-09-23 esto ya no hace falta en el día a día: cada foto se
 * optimiza sola al subirla (ver `register`) y un cron diario toma lo que haya
 * quedado pendiente. El botón queda para forzarlo en el momento.
 *
 * Antes recorría el bucket entero y reescribía archivos; ahora trabaja sobre
 * las filas sin miniatura, que es la fuente de verdad de qué falta, y no borra
 * los originales. Mantiene la forma de la respuesta que espera
 * OptimizarBucketButton.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60; // máximo del plan Hobby

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!esAdmin(user)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const limit = Number(url.searchParams.get("limit")) || 40;

  const service = await createServiceRoleClient();

  let r: Awaited<ReturnType<typeof reprocesarPendientes>>;
  try {
    r = await reprocesarPendientes(service, { limite: limit, simular: dryRun });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  const optimizadas = r.resultados.filter((x) => x.accion === "optimizada");
  if (optimizadas.length > 0) revalidarTienda();

  const totalOldBytes = optimizadas.reduce((a, x) => a + x.bytesAntes, 0);
  const totalNewBytes = optimizadas.reduce((a, x) => a + x.bytesDespues, 0);

  return NextResponse.json({
    dryRun,
    limit,
    totalFilesInBucket: r.pendientes,
    candidatesFound: r.pendientes,
    processedCount: optimizadas.length,
    totalOldBytes,
    totalNewBytes,
    savedBytes: totalOldBytes - totalNewBytes,
    savedPercent: totalOldBytes > 0 ? Math.round((1 - totalNewBytes / totalOldBytes) * 100) : 0,
    stats: r.resultados.map((x) => ({
      path: x.ruta,
      oldSize: x.bytesAntes,
      newSize: x.bytesDespues,
      ratio: x.bytesAntes > 0 ? x.bytesDespues / x.bytesAntes : 1,
      action:
        x.accion === "optimizada"
          ? "optimized"
          : x.accion === "error"
            ? "error"
            : x.accion === "simulada"
              ? "skipped-small"
              : "skipped-video",
      error: x.error,
    })),
  });
}
