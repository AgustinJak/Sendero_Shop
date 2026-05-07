/**
 * Helpers compartidos para pedidos_borrador.
 */

import { randomBytes } from "crypto";
import type { PedidoBorrador, PedidoBorradorItem, SenaTipo } from "@/types";

// Defaults para items custom sin dimensiones cargadas (mismos que el flujo
// de cotización/MiCorreo del checkout normal).
const DEFAULT_PESO_GR = 500;
const DEFAULT_ALTO_CM = 15;
const DEFAULT_ANCHO_CM = 15;
const DEFAULT_LARGO_CM = 10;

// Default de horas hasta expirar si admin no lo especifica.
export const DEFAULT_EXPIRACION_HORAS = 48;

/**
 * Genera un token URL-safe de 32 caracteres hex (128 bits de entropía).
 * Suficiente para que sea inguessable por brute force.
 */
export function generateToken(): string {
  return randomBytes(16).toString("hex");
}

/**
 * Suma los precios × cantidades de los items del borrador.
 */
export function calculateSubtotal(items: PedidoBorradorItem[]): number {
  return items.reduce(
    (acc, item) => acc + item.precio_unitario * item.cantidad,
    0
  );
}

/**
 * Calcula el monto a descontar dado un descuento por monto fijo o porcentaje.
 * Solo uno de los dos puede ser > 0 (validado por CHECK en la DB).
 */
export function calculateDescuento(
  subtotal: number,
  descuentoMonto: number,
  descuentoPorcentaje: number
): number {
  if (descuentoMonto > 0) return Math.min(descuentoMonto, subtotal);
  if (descuentoPorcentaje > 0)
    return Math.round((subtotal * descuentoPorcentaje) / 100);
  return 0;
}

/**
 * Devuelve el costo de envío que aplica a este borrador.
 * Prioridad: envio_gratis > costo_envio_override > cotización (null = cotizar).
 */
export function getCostoEnvioBorrador(
  borrador: Pick<PedidoBorrador, "envio_gratis" | "costo_envio_override">
): number | null {
  if (borrador.envio_gratis) return 0;
  if (borrador.costo_envio_override !== null)
    return Number(borrador.costo_envio_override);
  return null; // hay que cotizar
}

/**
 * Calcula peso y dimensiones del paquete completo del borrador para usarse
 * en cotización Correo Argentino y MiCorreo.
 *
 * Prioridad:
 *   1. Override completo del paquete (si los 4 campos están seteados)
 *   2. Suma de items (peso × cantidad, max alto/ancho, suma largo × cantidad)
 *      — items sin dimensiones caen a los defaults.
 */
export function calculateBorradorPackage(
  borrador: Pick<
    PedidoBorrador,
    | "items"
    | "paquete_peso_gr"
    | "paquete_alto_cm"
    | "paquete_ancho_cm"
    | "paquete_largo_cm"
  >
): { weight: number; height: number; width: number; length: number } {
  // Si admin definió override completo del paquete, usar tal cual.
  if (
    borrador.paquete_peso_gr !== null &&
    borrador.paquete_alto_cm !== null &&
    borrador.paquete_ancho_cm !== null &&
    borrador.paquete_largo_cm !== null
  ) {
    return {
      weight: borrador.paquete_peso_gr,
      height: borrador.paquete_alto_cm,
      width: borrador.paquete_ancho_cm,
      length: borrador.paquete_largo_cm,
    };
  }

  // Sumar desde items.
  let weight = 0;
  let height = 0;
  let width = 0;
  let length = 0;
  for (const item of borrador.items) {
    const peso = item.peso_gr ?? DEFAULT_PESO_GR;
    const alto = item.alto_cm ?? DEFAULT_ALTO_CM;
    const ancho = item.ancho_cm ?? DEFAULT_ANCHO_CM;
    const largo = item.largo_cm ?? DEFAULT_LARGO_CM;
    weight += peso * item.cantidad;
    height = Math.max(height, alto);
    width = Math.max(width, ancho);
    length += largo * item.cantidad;
  }

  // Si no había items (edge case), devolver defaults razonables.
  if (borrador.items.length === 0) {
    return {
      weight: DEFAULT_PESO_GR,
      height: DEFAULT_ALTO_CM,
      width: DEFAULT_ANCHO_CM,
      length: DEFAULT_LARGO_CM,
    };
  }

  return { weight, height, width, length };
}

/**
 * Calcula el monto de la seña dado el total final del pedido y la
 * configuración del borrador. Devuelve null si el borrador no tiene seña.
 *
 * Para tipo='porcentaje', valor está validado 10-90 por la DB.
 * Para tipo='monto_fijo', clampeamos al total para evitar montos imposibles.
 */
export function calculateSena(
  totalPedido: number,
  tipo: SenaTipo | null,
  valor: number | null
): number | null {
  if (!tipo || valor === null || valor <= 0) return null;
  if (tipo === "porcentaje") {
    return Math.round((totalPedido * valor) / 100);
  }
  return Math.min(Math.round(valor), totalPedido);
}

/**
 * Valida la estructura de un item de borrador. Tira con mensaje legible si algo
 * está mal. Llamar antes de insertar/actualizar.
 */
export function validateBorradorItem(item: unknown, idx: number): PedidoBorradorItem {
  if (!item || typeof item !== "object") {
    throw new Error(`Item ${idx + 1}: estructura inválida`);
  }
  const o = item as Record<string, unknown>;

  if (typeof o.nombre !== "string" || !o.nombre.trim()) {
    throw new Error(`Item ${idx + 1}: nombre requerido`);
  }
  if (typeof o.cantidad !== "number" || o.cantidad < 1 || !Number.isInteger(o.cantidad)) {
    throw new Error(`Item ${idx + 1} (${o.nombre}): cantidad debe ser entero ≥ 1`);
  }
  if (typeof o.precio_unitario !== "number" || o.precio_unitario < 0) {
    throw new Error(`Item ${idx + 1} (${o.nombre}): precio inválido`);
  }

  // Validaciones opcionales de dimensiones (si vienen, deben ser positivas)
  for (const key of ["peso_gr", "alto_cm", "ancho_cm", "largo_cm"] as const) {
    const v = o[key];
    if (v !== undefined && v !== null) {
      if (typeof v !== "number" || v <= 0 || !Number.isInteger(v)) {
        throw new Error(
          `Item ${idx + 1} (${o.nombre}): ${key} debe ser entero positivo`
        );
      }
    }
  }

  return {
    producto_id: (o.producto_id as string | null) ?? null,
    sku: (o.sku as string | null) ?? null,
    nombre: o.nombre.trim(),
    cantidad: o.cantidad,
    precio_unitario: o.precio_unitario,
    opciones_seleccionadas: (o.opciones_seleccionadas as PedidoBorradorItem["opciones_seleccionadas"]) ?? [],
    peso_gr: o.peso_gr as number | undefined,
    alto_cm: o.alto_cm as number | undefined,
    ancho_cm: o.ancho_cm as number | undefined,
    largo_cm: o.largo_cm as number | undefined,
    imagen_url: (o.imagen_url as string | undefined) || undefined,
    descripcion: (o.descripcion as string | undefined) || undefined,
  };
}
