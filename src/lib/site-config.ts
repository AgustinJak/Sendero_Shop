/**
 * Single source of truth para datos de configuración del sitio
 * (whatsapp, datos bancarios, etc).
 *
 * `getSiteConfig()` lee de la tabla `configuracion` y está envuelto en
 * React `cache()` para deduplicar dentro del mismo request.
 *
 * **Solo usable en server components / route handlers.** Para client
 * components, pasar los valores como props desde un parent server.
 */

import "server-only";
import { cache } from "react";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { parseTramos, TRAMOS_DEFAULT } from "@/lib/mayorista";
import type { MayoristaTramo } from "@/types";

// Fallbacks razonables si la tabla está vacía o un valor no fue seteado.
const DEFAULTS = {
  whatsapp: "5491124677639",
  cbu: "",
  alias: "",
  titular_cuenta: "",
  recargo_mp_porcentaje: 13,
  email_notificaciones: "",
  tiempo_produccion_default: 7,
  envio_gratis_desde: 250000, // subtotal (ARS) a partir del cual el envío es gratis (0 = desactivado)
  // Descuento por cantidad: se aplica por línea del carrito según las unidades
  // de ese modelo/variante. Formato en la config: "5:10, 10:20, 20:30".
  descuento_tramos: TRAMOS_DEFAULT as MayoristaTramo[],
  // Piezas vendidas FUERA de la web (Mercado Libre, ferias, venta directa).
  // La base del shop solo conoce sus propios pedidos, asi que este numero se
  // carga a mano y se le suma `unidades_vendidas` de los productos. De esa
  // forma la prueba social del hero sigue creciendo sola con las ventas web
  // en vez de quedar congelada en una cifra escrita en el JSX.
  unidades_vendidas_base: 900,
  // % del total que se pide como anticipo en los pedidos en efectivo (que son
  // siempre con retiro en persona). 0 = desactivado, vuelven a confirmarse sin
  // pagar nada. Ver lib/sena.ts.
  sena_efectivo_porcentaje: 20,
};

export type SiteConfig = typeof DEFAULTS;

export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  const db = await createServiceRoleClient();
  const { data } = await db.from("configuracion").select("key, value");

  const map: Record<string, string> = {};
  for (const row of data ?? []) map[row.key] = row.value;

  return {
    whatsapp: map.whatsapp || DEFAULTS.whatsapp,
    cbu: map.cbu || DEFAULTS.cbu,
    alias: map.alias || DEFAULTS.alias,
    titular_cuenta: map.titular_cuenta || DEFAULTS.titular_cuenta,
    recargo_mp_porcentaje:
      Number(map.recargo_mp_porcentaje) || DEFAULTS.recargo_mp_porcentaje,
    email_notificaciones:
      map.email_notificaciones || DEFAULTS.email_notificaciones,
    tiempo_produccion_default:
      Number(map.tiempo_produccion_default) || DEFAULTS.tiempo_produccion_default,
    // Respeta 0 (desactivado); solo cae al default si está vacío/ausente/NaN.
    envio_gratis_desde:
      map.envio_gratis_desde != null &&
      map.envio_gratis_desde !== "" &&
      !isNaN(Number(map.envio_gratis_desde))
        ? Number(map.envio_gratis_desde)
        : DEFAULTS.envio_gratis_desde,
    // Respeta "" (desactivado); solo cae al default si la clave no existe.
    descuento_tramos: parseTramos(map.descuento_tramos),
    unidades_vendidas_base:
      map.unidades_vendidas_base != null &&
      map.unidades_vendidas_base !== "" &&
      !isNaN(Number(map.unidades_vendidas_base))
        ? Number(map.unidades_vendidas_base)
        : DEFAULTS.unidades_vendidas_base,
    // Respeta 0 (desactivado), igual que envio_gratis_desde.
    sena_efectivo_porcentaje:
      map.sena_efectivo_porcentaje != null &&
      map.sena_efectivo_porcentaje !== "" &&
      !isNaN(Number(map.sena_efectivo_porcentaje))
        ? Number(map.sena_efectivo_porcentaje)
        : DEFAULTS.sena_efectivo_porcentaje,
  };
});

/**
 * Atajo cuando solo necesitás el número de WhatsApp.
 */
export async function getWhatsapp(): Promise<string> {
  return (await getSiteConfig()).whatsapp;
}
