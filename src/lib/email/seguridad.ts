/**
 * Defensas de los emails que manda la tienda. Ver SHOP - Seguridad, punto 3.
 *
 * El problema: los emails se arman con datos que escribe el cliente (nombre,
 * teléfono, sucursal) y se mandan a la dirección que el cliente pone. Sin
 * escapar, alguien ponía HTML en el nombre —un botón "Pagá acá" con un link
 * falso— y el email de otra persona, y la tienda le mandaba a esa persona un
 * email legítimo de sendero3d.com, con SPF y DKIM válidos, con contenido ajeno.
 */

const ENTIDADES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escapa un valor para meterlo en HTML (contenido o atributo entre comillas).
 * Todo dato que no escribimos nosotros en el código pasa por acá antes de ir a
 * una plantilla: lo del cliente, pero también lo del admin (motivo de
 * cancelación, tracking), que no tiene por qué ser HTML.
 */
export function escaparHtml(valor: unknown): string {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}

/**
 * Una sola dirección de email, con forma válida.
 *
 * El transporte acepta varias direcciones separadas por coma en `to`: sin esto,
 * un solo pedido con "a@x.com, b@y.com, …" mandaba la confirmación a cientos de
 * personas. Por eso se rechazan comas, punto y coma, espacios y saltos de línea,
 * no solo lo que "no parece" un email.
 */
export function esEmailValido(email: unknown): email is string {
  if (typeof email !== "string") return false;
  if (email.length > 254) return false;
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(email);
}

/** Saca saltos de línea: un asunto con CR/LF puede meter headers extra en el email. */
export function limpiarLinea(valor: unknown): string {
  return String(valor ?? "").replace(/[\r\n]+/g, " ").trim();
}
