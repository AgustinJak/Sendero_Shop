import "server-only";
import { createHash } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase-server";

/**
 * Rate limit persistente, contra la base (`public.consumir_limite`).
 *
 * Reemplaza a `lib/rate-limit.ts`, que guardaba los contadores en la memoria
 * de cada instancia de Vercel: cada request podía caer en otra instancia, así
 * que en la práctica no limitaba nada. Ver SHOP - Seguridad, punto 2.
 *
 * Si la base falla, se deja pasar: es preferible no perder una venta por un
 * problema nuestro a bloquear a un cliente real. El error queda en el log.
 */
export async function dentroDelLimite(clave: string, max: number, ventanaSeg: number): Promise<boolean> {
  try {
    const db = await createServiceRoleClient();
    const { data, error } = await db.rpc("consumir_limite", {
      p_clave: clave,
      p_max: max,
      p_ventana_seg: ventanaSeg,
    });
    if (error) throw error;
    return data === true;
  } catch (err) {
    console.error("[limite] no se pudo consultar, se deja pasar:", (err as Error).message);
    return true;
  }
}

/**
 * Hash corto de un dato identificatorio (IP, email) para usarlo en la clave.
 * En la tabla de límites no queda ni la IP ni el email en claro.
 */
export function huella(valor: string): string {
  return createHash("sha256").update(`sendero-limites:${valor.trim().toLowerCase()}`).digest("hex").slice(0, 24);
}

/**
 * IP del visitante. En Vercel `x-forwarded-for` lo arma la plataforma (pisa el
 * que mande el cliente), así que el primer valor es confiable.
 */
export function ipDe(req: { headers: { get(nombre: string): string | null } }): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "desconocida"
  );
}
