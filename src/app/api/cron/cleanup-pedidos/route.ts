import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";

const HORAS_PARA_CANCELAR = 48;
const HORAS_PARA_BORRAR = 48;

/**
 * Mantenimiento diario de pedidos. Dos fases:
 *
 * 1. **Cancelar** los que llevan más de 48 h en `pendiente_pago` — nunca se
 *    pagaron. Aplica a transferencia, a MercadoPago y a los pedidos en
 *    efectivo cuya seña quedó sin abonar (ver lib/sena.ts).
 * 2. **Borrar** los que están `cancelado` desde hace más de 48 h.
 *
 * La fase 1 no existía: el checkout y los emails venían prometiendo "a las
 * 48 h el pedido se cancela automáticamente" desde 2026-03, pero nada lo
 * hacía y los pedidos impagos quedaban colgados para siempre.
 *
 * El cron corre una vez por día (06:00 UTC, ver vercel.json), así que en la
 * práctica un pedido se cancela entre las 48 y las 72 h.
 */
export async function GET(req: NextRequest) {
  // Verify cron secret (Vercel Cron sends this header)
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();
  const ahora = Date.now();

  // --- Fase 1: cancelar los impagos ---
  const cutoffCancelar = new Date(
    ahora - HORAS_PARA_CANCELAR * 60 * 60 * 1000
  ).toISOString();

  const { data: impagos } = await supabase
    .from("pedidos")
    .select("id")
    .eq("estado", "pendiente_pago")
    .lt("created_at", cutoffCancelar);

  let cancelados = 0;
  if (impagos?.length) {
    const ids = impagos.map((p: { id: string }) => p.id);
    const { error } = await supabase
      .from("pedidos")
      .update({ estado: "cancelado", cancelado_at: new Date().toISOString() })
      .in("id", ids);

    if (error) {
      console.error("Cron: error cancelando impagos:", error);
    } else {
      cancelados = ids.length;
    }
  }

  // --- Fase 2: borrar los cancelados viejos ---
  const cutoffBorrar = new Date(
    ahora - HORAS_PARA_BORRAR * 60 * 60 * 1000
  ).toISOString();

  const { data: pedidos } = await supabase
    .from("pedidos")
    .select("id")
    .eq("estado", "cancelado")
    .lt("cancelado_at", cutoffBorrar);

  if (!pedidos || pedidos.length === 0) {
    return NextResponse.json({ cancelados, deleted: 0 });
  }

  const ids = pedidos.map((p: { id: string }) => p.id);

  // Delete items first
  await supabase.from("pedido_items").delete().in("pedido_id", ids);
  // Then delete pedidos
  const { error } = await supabase.from("pedidos").delete().in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ cancelados, deleted: ids.length });
}
