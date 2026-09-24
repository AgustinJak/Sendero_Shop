import "server-only";
import { dentroDelLimite, huella } from "@/lib/limite";

/**
 * Verificación del captcha (Cloudflare Turnstile) de las rutas que crean pedidos.
 *
 * Antes cada ruta tenía su copia y las dos tenían el mismo hueco:
 *
 * - **Fallaba abierto.** Si faltaba TURNSTILE_SECRET_KEY, el captcha se
 *   salteaba en silencio. En producción ahora se rechaza y queda en el log.
 * - **Dependía solo de Cloudflare para no reusar tokens.** El 2026-09-24 se
 *   reenvió dos veces desde la consola el request de un pedido ya creado, con
 *   el mismo token, y los dos reenvíos crearon pedidos; Cloudflare documenta
 *   que eso no debería pasar y no se pudo reconstruir por qué pasó. Ahora cada
 *   token se anota en `limites_api` y un segundo uso se rechaza acá, pase lo
 *   que pase del lado de Cloudflare. Ver SHOP - Seguridad.
 */
export type ResultadoCaptcha = { ok: true } | { ok: false; status: number; error: string };

const FALLIDA = "Verificación de seguridad fallida. Recargá e intentá de nuevo.";

export async function verificarCaptcha(token: unknown, ip: string): Promise<ResultadoCaptcha> {
  const secreto = process.env.TURNSTILE_SECRET_KEY;

  if (!secreto) {
    // En local se puede trabajar sin captcha; en producción, nunca.
    if (process.env.VERCEL_ENV === "production") {
      console.error("[captcha] Falta TURNSTILE_SECRET_KEY en producción: se rechazan los pedidos hasta configurarla.");
      return { ok: false, status: 503, error: "No podemos recibir pedidos en este momento. Probá de nuevo en unos minutos." };
    }
    return { ok: true };
  }

  if (typeof token !== "string" || token.length < 10 || token.length > 4096) {
    return { ok: false, status: 400, error: "Completá la verificación de seguridad" };
  }

  // Un token, un uso. Se anota antes de consultar a Cloudflare: si la consulta
  // falla, el token igual queda gastado, que es lo correcto para un token de
  // un solo uso. Vale 5 minutos; la marca dura 10 por las dudas.
  if (!(await dentroDelLimite(`captcha:${huella(token)}`, 1, 600))) {
    return { ok: false, status: 403, error: FALLIDA };
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: secreto, response: token, remoteip: ip }),
    });
    const datos = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (datos.success !== true) {
      return { ok: false, status: 403, error: FALLIDA };
    }
    return { ok: true };
  } catch (err) {
    // Sin respuesta de Cloudflare no hay forma de saber si es una persona.
    console.error("[captcha] siteverify no respondió:", (err as Error).message);
    return { ok: false, status: 503, error: "No pudimos verificar la seguridad. Probá de nuevo en un momento." };
  }
}
