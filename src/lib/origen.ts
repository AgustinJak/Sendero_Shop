/**
 * De dónde llegó una visita (SHOP - Analítica propia). Lo usan el navegador
 * (lib/pulso.ts), el servidor al validar y el dashboard para los nombres.
 *
 * No importa nada: se puede probar con node suelto.
 */

export const ORIGENES = {
  meta_ads: "Anuncios de Meta",
  google_ads: "Anuncios de Google",
  instagram: "Instagram",
  facebook: "Facebook",
  google: "Google",
  otros_buscadores: "Otros buscadores",
  ia: "ChatGPT y otras IA",
  whatsapp: "WhatsApp",
  mercadolibre: "Mercado Libre",
  tiktok: "TikTok",
  youtube: "YouTube",
  email: "Email",
  otro_sitio: "Otros sitios",
  directo: "Directo",
  a_medida: "Pedido a medida",
  sin_dato: "Sin dato (antes de medir)",
} as const;

export type Origen = keyof typeof ORIGENES;

/** Los que puede mandar el navegador. `a_medida` y `sin_dato` los pone el servidor. */
const ORIGENES_DEL_NAVEGADOR = new Set<string>(
  Object.keys(ORIGENES).filter((o) => o !== "a_medida" && o !== "sin_dato")
);

export function limpiarOrigen(valor: unknown): Origen | null {
  return typeof valor === "string" && ORIGENES_DEL_NAVEGADOR.has(valor) ? (valor as Origen) : null;
}

/** utm_campaign: minúsculas, letras, números, guion y guion bajo. */
export function limpiarCampania(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpia = valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\s+]+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return limpia || null;
}

const MEDIO_PAGO = /^(paid|cpc|ppc|cpm|ads?|paid[-_]?social|pago)$/;

function porFuenteUtm(fuente: string): Origen {
  if (/^(meta|facebook_ads|meta_ads)$/.test(fuente)) return "meta_ads";
  if (/^(facebook|fb)$/.test(fuente)) return "facebook";
  if (/^(instagram|ig)$/.test(fuente)) return "instagram";
  if (/^google/.test(fuente)) return "google";
  if (/chatgpt|openai|perplexity|gemini|claude|copilot/.test(fuente)) return "ia";
  if (/^(whatsapp|wa)$/.test(fuente)) return "whatsapp";
  if (/^(mercadolibre|ml|meli)$/.test(fuente)) return "mercadolibre";
  if (/tiktok/.test(fuente)) return "tiktok";
  if (/youtube/.test(fuente)) return "youtube";
  if (/^(email|mail|newsletter)$/.test(fuente)) return "email";
  return "otro_sitio";
}

function porReferente(host: string): Origen {
  if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/.test(host)) return "facebook";
  // Antes que Google: gemini.google.com es una IA, no el buscador.
  if (/(^|\.)(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai)$/.test(host) || host === "gemini.google.com" || host === "copilot.microsoft.com") return "ia";
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return "google";
  if (/(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org|search\.brave\.com)$/.test(host)) return "otros_buscadores";
  if (/(^|\.)(whatsapp\.com|wa\.me)$/.test(host)) return "whatsapp";
  if (/(^|\.)mercadolibre\.com(\.ar)?$/.test(host)) return "mercadolibre";
  if (/(^|\.)tiktok\.com$/.test(host)) return "tiktok";
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return "youtube";
  return "otro_sitio";
}

/**
 * Clasifica la llegada a la tienda. Devuelve null si la visita viene de la
 * misma tienda (navegación interna o recarga) y no trae etiquetas de
 * campaña: en ese caso se mantiene el origen que ya tenía la visita.
 *
 * Las etiquetas utm mandan sobre el sitio de referencia. Para que un anuncio
 * de Meta cuente como anuncio (y no como Facebook), el link tiene que llevar
 * utm_source=meta (o facebook/instagram con utm_medium=paid).
 */
export function clasificarOrigen(
  url: URL,
  referente: string,
  hostPropio: string
): { origen: Origen; campania: string | null } | null {
  const p = url.searchParams;
  const fuente = (p.get("utm_source") || "").toLowerCase().trim();
  const medio = (p.get("utm_medium") || "").toLowerCase().trim();
  const campania = limpiarCampania(p.get("utm_campaign"));
  const pago = MEDIO_PAGO.test(medio);

  if (p.has("gclid") || (pago && /google/.test(fuente))) return { origen: "google_ads", campania };
  if (pago && /^(meta|facebook|fb|instagram|ig)$/.test(fuente)) return { origen: "meta_ads", campania };
  if (fuente) return { origen: porFuenteUtm(fuente), campania };

  if (!referente) return { origen: "directo", campania };
  let host: string;
  try {
    host = new URL(referente).hostname.toLowerCase();
  } catch {
    return { origen: "otro_sitio", campania };
  }
  if (host === hostPropio || host.endsWith(`.${hostPropio}`) || host === "sendero3d.com" || host.endsWith(".sendero3d.com")) {
    return null;
  }
  return { origen: porReferente(host), campania };
}
