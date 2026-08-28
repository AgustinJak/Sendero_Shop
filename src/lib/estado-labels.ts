import type { EstadoPedido, MetodoPago, MetodoEnvio, TipoEnvio } from "@/types";

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

/**
 * Etiqueta visible para el método de envío.
 *
 * Existe como función única porque antes cada pantalla resolvía el nombre con
 * un ternario binario del tipo `=== "correo_argentino" ? "Correo Argentino" :
 * "Andreani"`. Al sumar la moto mensajería, los cinco lugares que hacían eso
 * empezaron a mostrar **"Andreani"** en los pedidos del courier: en la página
 * del pedido, en el admin y en dos emails.
 *
 * Andreani además es residuo: se dejó de ofrecer el 2026-03-30 y solo quedan
 * pedidos viejos con ese valor.
 */
export const METODO_ENVIO_LABELS: Record<MetodoEnvio, string> = {
  retiro: "Retiro en persona",
  correo_argentino: "Correo Argentino",
  syb: "Moto mensajería",
  andreani: "Andreani",
};

/**
 * Nombre del método, con el tipo entre paréntesis cuando aporta.
 *
 * El sufijo domicilio/sucursal solo tiene sentido en Correo Argentino: el
 * retiro y la moto son siempre una sola modalidad.
 */
export function getMetodoEnvioLabel(
  metodo: MetodoEnvio,
  tipo?: TipoEnvio | null,
  formato: "parentesis" | "guion" = "parentesis"
): string {
  const base = METODO_ENVIO_LABELS[metodo] ?? metodo;
  if (metodo !== "correo_argentino" || !tipo) return base;

  const sufijo = tipo === "domicilio" ? "a domicilio" : "a sucursal";
  return formato === "guion" ? `${base} — ${sufijo}` : `${base} (${sufijo})`;
}
