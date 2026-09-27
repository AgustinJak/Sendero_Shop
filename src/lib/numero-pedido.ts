import "server-only";
import type { createServiceRoleClient } from "@/lib/supabase-server";

type Db = Awaited<ReturnType<typeof createServiceRoleClient>>;

/**
 * Reserva el próximo número de pedido ("SS-00114").
 *
 * El contador vive en `configuracion.pedido_counter` y nunca retrocede, así que
 * un número no se repite aunque se borren pedidos. Antes cada ruta lo leía, le
 * sumaba uno y lo volvía a escribir: dos pedidos simultáneos leían el mismo
 * valor y el segundo chocaba contra el UNIQUE y se perdía. La función de la
 * base (`siguiente_numero_pedido`, migración `numero_pedido_atomico`) lo hace
 * en un solo UPDATE. Ver SHOP - Seguridad, punto 12.
 *
 * Necesita el cliente con service role: la función no se puede ejecutar con
 * la clave pública.
 */
export async function siguienteNumeroPedido(db: Db): Promise<string> {
  const { data, error } = await db.rpc("siguiente_numero_pedido");
  if (error) throw error;
  if (typeof data !== "string" || !data.startsWith("SS-")) {
    throw new Error(`Número de pedido inesperado: ${String(data)}`);
  }
  return data;
}
