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

// Recargo MercadoPago (13%)
export const MP_RECARGO = 0.13;

export function calcularRecargoMP(subtotal: number): number {
  return Math.round(subtotal * MP_RECARGO);
}

// WhatsApp link
export function whatsappLink(message: string): string {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/5491125502785?text=${encoded}`;
}

// Número de pedido
export function formatOrderNumber(num: number): string {
  return `SS-${String(num).padStart(5, "0")}`;
}
