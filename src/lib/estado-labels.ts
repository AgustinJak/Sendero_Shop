import type { EstadoPedido, MetodoPago } from "@/types";

/**
 * Etiqueta visible para un estado de pedido.
 *
 * Para pago en efectivo, "pago_confirmado" se muestra como "Pedido confirmado"
 * porque el dinero todavía no se recibió — la confirmación efectiva del pago
 * ocurre al momento de la entrega/retiro.
 */
export const ESTADO_LABELS: Record<EstadoPedido, string> = {
  pendiente_pago: "Pendiente de pago",
  pago_confirmado: "Pago confirmado",
  en_produccion: "En producción",
  impreso: "Terminado",
  enviado: "Enviado",
  esperando_retiro: "Esperando retiro",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export function getEstadoLabel(
  estado: EstadoPedido,
  metodoPago?: MetodoPago | null
): string {
  if (estado === "pago_confirmado" && metodoPago === "efectivo") {
    return "Pedido confirmado";
  }
  return ESTADO_LABELS[estado];
}
