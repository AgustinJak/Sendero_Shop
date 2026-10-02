import "server-only";
import { createServiceRoleClient } from "@/lib/supabase-server";
import {
  conReintentos,
  enviarEstadoAInventario,
  InventarioWebhookError,
} from "@/lib/inventario-webhook";

/**
 * Aviso de entrega al Inventario (evento `pedido.estado_cambiado`, SHOP -
 * Integración Inventario).
 *
 * Al pasar un pedido a "entregado", el Inventario lo cierra (COMPLETADO) y
 * recién ahí consume las reservas de stock. Antes ese paso era manual y se
 * podía olvidar, con stock apartado que ya había salido.
 *
 * El resultado queda en el pedido (`inventario_aviso`, `_detalle`, `_at`) y se
 * ve en el admin: un fallo no se pierde en silencio. Lo que no quedó en "ok" o
 * "ignorado" lo reintenta el cron diario durante 30 días.
 *
 * Respuestas del Inventario:
 *   200 ok:true      → ok, listo
 *   200 ignorado     → ignorado (no maneja ese estado), listo
 *   404              → sin_pedido: ese número no existe allá
 *   401              → firma: secret o firma mal configurados
 *   otro 4xx         → rechazado
 *   5xx o timeout    → reintentar (ya con 3 intentos y backoff)
 */

type Db = Awaited<ReturnType<typeof createServiceRoleClient>>;

export type ResultadoAviso = "ok" | "ignorado" | "reintentar" | "sin_pedido" | "firma" | "rechazado" | "sin_enviar";

/** Los que el cron vuelve a intentar: todo lo que no terminó bien. */
export const AVISOS_A_REINTENTAR: ResultadoAviso[] = ["reintentar", "sin_pedido", "firma", "rechazado", "sin_enviar"];

async function guardar(db: Db, pedidoId: string, resultado: ResultadoAviso, detalle: string | null) {
  const { error } = await db
    .from("pedidos")
    .update({
      inventario_aviso: resultado,
      inventario_aviso_detalle: detalle?.slice(0, 500) ?? null,
      inventario_aviso_at: new Date().toISOString(),
    })
    .eq("id", pedidoId);
  if (error) console.error(`[inventario-estado] no se pudo guardar el resultado de ${pedidoId}:`, error.message);
}

/**
 * Le avisa al Inventario que el pedido se entregó. Nunca tira error hacia
 * afuera: se llama con `after()` desde el admin y desde el cron.
 */
export async function avisarEntregaAInventario(pedidoId: string): Promise<ResultadoAviso | null> {
  let db: Db;
  try {
    db = await createServiceRoleClient();
  } catch (err) {
    console.error("[inventario-estado] sin base:", (err as Error).message);
    return null;
  }

  const { data: pedido } = await db
    .from("pedidos")
    .select("numero_pedido, estado, enviado_inventario, entregado_at")
    .eq("id", pedidoId)
    .single();
  if (!pedido || pedido.estado !== "entregado") return null;

  // Si nunca se mandó al Inventario no hay nada que cerrar allá. Queda anotado
  // por si después se manda: el cron lo vuelve a mirar.
  if (!pedido.enviado_inventario) {
    await guardar(db, pedidoId, "sin_enviar", "El pedido nunca se envió al inventario.");
    return "sin_enviar";
  }

  let resultado: ResultadoAviso;
  let detalle: string | null = null;
  try {
    const respuesta = await conReintentos(() =>
      enviarEstadoAInventario({
        evento: "pedido.estado_cambiado",
        numero_pedido: pedido.numero_pedido,
        estado_shop: "entregado",
        fecha: pedido.entregado_at ?? new Date().toISOString(),
      })
    );
    if (respuesta?.ignorado) {
      resultado = "ignorado";
      detalle = typeof respuesta.ignorado === "string" ? respuesta.ignorado : JSON.stringify(respuesta.ignorado);
    } else {
      resultado = "ok";
    }
  } catch (err) {
    const status = err instanceof InventarioWebhookError ? err.status : undefined;
    detalle = (err as Error).message;
    if (status === 404) resultado = "sin_pedido";
    else if (status === 401) resultado = "firma";
    else if (status !== undefined && status >= 400 && status < 500) resultado = "rechazado";
    else resultado = "reintentar";
    console.error(`[inventario-estado] ${pedido.numero_pedido}: ${resultado} — ${detalle}`);
  }

  await guardar(db, pedidoId, resultado, detalle);
  return resultado;
}

/**
 * Reintento diario (cron): pedidos entregados en los últimos 30 días cuyo
 * aviso no terminó bien. Uno por vez, hasta 20 por corrida.
 */
export async function reintentarAvisosDeEntrega(db: Db): Promise<number> {
  const desde = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const { data: pendientes } = await db
    .from("pedidos")
    .select("id")
    .eq("estado", "entregado")
    .in("inventario_aviso", AVISOS_A_REINTENTAR)
    .gte("entregado_at", desde)
    .order("entregado_at", { ascending: true })
    .limit(20);

  let intentados = 0;
  for (const p of pendientes ?? []) {
    await avisarEntregaAInventario(p.id);
    intentados++;
  }
  return intentados;
}
