import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import {
  calculateSubtotal,
  calculateDescuento,
  getCostoEnvioBorrador,
} from "@/lib/borrador";
import type { PedidoBorrador } from "@/types";

/**
 * Endpoint público para que el cliente cargue su borrador desde el link.
 * NO requiere auth — la seguridad es por el token (32 chars hex).
 *
 *   GET /api/borradores/publico/[token]
 *
 * Devuelve solo los campos que el cliente necesita ver/usar. Esconde
 * `notas_admin` (privado), `created_by`, etc.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || !/^[a-f0-9]{32}$/.test(token)) {
    return NextResponse.json({ error: "Link inválido" }, { status: 400 });
  }

  const service = await createServiceRoleClient();
  const { data, error } = await service
    .from("pedidos_borrador")
    .select("*")
    .eq("token", token)
    .single();

  if (error || !data) {
    // Mensaje genérico para no filtrar info sobre el token
    return NextResponse.json({ error: "Link no encontrado" }, { status: 404 });
  }

  const b = data as PedidoBorrador;

  // Marcar como expirado al vuelo si ya venció (también lo hace el cron,
  // pero esto cubre el gap)
  let estadoEfectivo = b.estado;
  if (b.estado === "pendiente" && new Date(b.expires_at) < new Date()) {
    estadoEfectivo = "expirado";
  }

  const subtotal = calculateSubtotal(b.items);
  const descuento = calculateDescuento(
    subtotal,
    Number(b.descuento_monto),
    Number(b.descuento_porcentaje)
  );
  const totalSinEnvio = subtotal - descuento;
  const costoEnvioFijo = getCostoEnvioBorrador(b);

  return NextResponse.json({
    borrador: {
      id: b.id,
      token: b.token,
      items: b.items,
      estado: estadoEfectivo,
      pedido_id: b.pedido_id,
      expires_at: b.expires_at,
      created_at: b.created_at,
      // Métodos de pago permitidos (null = todos)
      metodos_pago_permitidos: b.metodos_pago_permitidos,
      // Costos pre-calculados para que el cliente no los recalcule
      subtotal,
      descuento,
      total_sin_envio: totalSinEnvio,
      // Si hay override de envío, lo enviamos directo. null = hay que cotizar.
      costo_envio_fijo: costoEnvioFijo,
      envio_gratis: b.envio_gratis,
    },
  });
}
