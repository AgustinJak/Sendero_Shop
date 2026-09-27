import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * Limpia el HTML de la descripción de un producto (SHOP - Seguridad, punto 10).
 *
 * La descripción se escribe en el editor del panel y la ficha la dibuja como
 * HTML. Quien pudiera escribir en `productos.descripcion` podía meter un
 * <script> o un onerror que se ejecutaba en el navegador de cada visitante.
 * Se limpia dos veces: al guardar (rutas del admin) y al mostrar (la ficha),
 * así una fila vieja o editada a mano en la base tampoco pasa.
 *
 * La lista sale de lo que genera el editor (StarterKit + Link + Underline).
 * Al 2026-09-24 las descripciones usan p, br, ul, li, strong, em, u, h3 y hr,
 * sin atributos.
 */
const OPCIONES: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "strong", "b", "em", "i", "u", "s",
    "h2", "h3", "h4",
    "ul", "ol", "li",
    "blockquote", "code", "pre",
    "a",
  ],
  // target y rel los pone siempre transformTags (pisa lo que venga).
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }),
  },
};

export function limpiarDescripcion(html: unknown): string {
  if (typeof html !== "string" || !html) return "";
  return sanitizeHtml(html, OPCIONES);
}

/**
 * JSON para un <script type="application/ld+json">. JSON.stringify no escapa
 * "<", así que un nombre o una descripción con "</script>" cerraba el bloque
 * y lo que seguía se ejecutaba como código. Con "<" escapado el JSON sigue
 * siendo el mismo para Google.
 */
export function jsonLdSeguro(datos: unknown): string {
  return JSON.stringify(datos).replace(/</g, "\\u003c");
}
