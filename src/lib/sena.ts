/**
 * Seña de los pedidos en efectivo.
 *
 * Un pedido en efectivo se paga al retirar, así que hasta 2026-08-16 nacía
 * directamente en `pago_confirmado`: alguien completaba el checkout sin poner
 * un peso y el pedido entraba a producción. Si después no aparecía, la
 * impresión ya estaba hecha.
 *
 * Ahora se pide un anticipo. El pedido nace en `pendiente_pago` y recién pasa
 * a `pago_confirmado` cuando la seña se cobra (webhook de MP) o se marca a
 * mano en el admin (transferencia).
 *
 * El cálculo vive acá y no en `lib/borrador.ts` porque son dos cosas distintas:
 * la del borrador es una seña **por pedido**, que el admin define a mano al
 * armarlo; esta es una regla **global** del checkout público.
 *
 * Este módulo no importa `site-config` a propósito: es `server-only` y el
 * checkout necesita calcular la seña en el browser. El porcentaje se pasa como
 * argumento.
 */

/** Solo el efectivo lleva seña. Transferencia y MP ya se cobran por adelantado. */
export function requiereSena(
  metodoPago: string,
  porcentaje: number
): boolean {
  return metodoPago === "efectivo" && porcentaje > 0;
}

/**
 * Monto del anticipo, redondeado al peso.
 *
 * Se clampea el porcentaje a 1-100: un valor fuera de rango en la config no
 * debería poder generar una seña negativa ni mayor al total.
 */
export function calcularSenaEfectivo(
  total: number,
  porcentaje: number
): number {
  const pct = Math.min(Math.max(porcentaje, 1), 100);
  return Math.round((total * pct) / 100);
}
