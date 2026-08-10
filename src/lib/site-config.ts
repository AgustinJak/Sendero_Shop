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
  };
});

/**
 * Atajo cuando solo necesitás el número de WhatsApp.
 */
export async function getWhatsapp(): Promise<string> {
  return (await getSiteConfig()).whatsapp;
}
