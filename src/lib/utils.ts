import { type ClassValue, clsx } from "clsx";

// Instalar: npm install clsx
export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(" ");
}

// Formato de precio en ARS
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

// Generar slug URL-friendly
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Validar DNI argentino (7-8 dígitos numéricos)
export function validarDNI(dni: string): boolean {
  const cleaned = dni.replace(/\D/g, "");
  return cleaned.length >= 7 && cleaned.length <= 8;
}

// Recargo MercadoPago — el porcentaje viene de configuracion.recargo_mp_porcentaje.
// Default de fallback si no está seteado.
export const MP_RECARGO_DEFAULT_PCT = 13;

/**
 * Calcula el recargo de MercadoPago sobre una base.
 * @param base monto sobre el que se aplica el recargo (subtotal + envío)
 * @param pct porcentaje de recargo (ej: 7 para 7%). Default 13.
 */
export function calcularRecargoMP(base: number, pct: number = MP_RECARGO_DEFAULT_PCT): number {
  return Math.round((base * pct) / 100);
}

// WhatsApp link — el número viene de configuracion (lib/site-config.ts).
// Esta función es pura: pasale el phone (sin "+" ni espacios) y opcionalmente un mensaje.
export function whatsappLink(phone: string, message?: string): string {
  const base = `https://wa.me/${phone}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

/**
 * Formatea "5491128290007" → "+54 9 11 2829-0007" para mostrar al usuario.
 * Si el número no matchea el patrón esperado, devuelve "+<phone>" tal cual.
 */
export function formatWhatsappDisplay(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 13 && clean.startsWith("549")) {
    return `+${clean.slice(0, 2)} ${clean.slice(2, 3)} ${clean.slice(3, 5)} ${clean.slice(5, 9)}-${clean.slice(9)}`;
  }
  return `+${clean}`;
}

// Rich text prose styles (Tailwind v4 utility classes)
export const PROSE_CLASSES =
  "[&_p]:mb-3 [&_p:last-child]:mb-0 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-niebla [&_h4]:text-base [&_h4]:font-semibold [&_h4]:mt-4 [&_h4]:mb-1.5 [&_h4]:text-niebla [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_li]:mb-1 [&_li_p]:mb-0 [&_hr]:border-t [&_hr]:border-lavanda/20 [&_hr]:my-4 [&_a]:text-ambar [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-bold [&_strong]:text-niebla [&_em]:italic [&_u]:underline [&_u]:underline-offset-2";

// Número de pedido
export function formatOrderNumber(num: number): string {
  return `SS-${String(num).padStart(5, "0")}`;
}
