import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { reprocesarPendientes } from "@/lib/imagenes";
import { revalidarTienda } from "@/lib/revalidar";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // máximo del plan Hobby

/**
 * Red de seguridad diaria para las fotos (06:30 UTC, ver vercel.json).
 *
 * Cada foto ya se optimiza sola al subirla (ver `register`). Esto toma lo que
 * haya quedado sin versión optimizada — una subida donde sharp falló, o una
 * foto que entró por otro camino — para que nadie tenga que acordarse de
 * apretar un botón. Si no hay pendientes, no hace nada.
 */
export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();
  const r = await reprocesarPendientes(supabase, { limite: 40, tiempoMaxMs: 50_000 });

  const optimizadas = r.resultados.filter((x) => x.accion === "optimizada").length;
  const errores = r.resultados.filter((x) => x.accion === "error");
  if (optimizadas > 0) revalidarTienda();
  for (const e of errores) console.error("[cron/optimizar-imagenes]", e.ruta, e.error);

  return NextResponse.json({ pendientes: r.pendientes, optimizadas, errores: errores.length });
}
