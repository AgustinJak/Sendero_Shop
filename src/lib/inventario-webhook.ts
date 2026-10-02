/**
 * Cliente del webhook Shop → Inventario Sendero 3D.
 *
 * Dos eventos, mismo endpoint y misma firma:
 * - `pedido.confirmado`: el pedido entero, lo manda el botón "Enviar a
 *   Inventario" del admin. Idempotente por `numero_pedido`.
 * - `pedido.estado_cambiado`: solo número, estado y fecha. Hoy se manda al
 *   marcar "entregado", para que el Inventario lo pase a COMPLETADO y consuma
 *   las reservas (lib/inventario-estado.ts).
 *
 * Endpoint: POST {INVENTARIO_WEBHOOK_URL}
 *   Headers:
 *     Content-Type: application/json
 *     x-shop-signature: HMAC-SHA256(`${timestamp}.${rawBody}`, SECRET) hex lowercase
 *     x-shop-timestamp: Unix timestamp en SEGUNDOS
 *     x-shop-tenant: sendero3d
 *
 * Ojo: la firma es sobre `timestamp.cuerpo`, no sobre el cuerpo solo, y el
 * timestamp va en segundos, no en milisegundos. Es lo que el receptor ya
 * verifica para pedido.confirmado; el evento nuevo no lo cambia.
 */

import { createHmac } from "crypto";

// ---------- Config ----------

function getConfig() {
  const url = process.env.INVENTARIO_WEBHOOK_URL;
  // Aceptamos SHOP_WEBHOOK_SECRET como fallback porque desde el lado del
  // inventario el secret se llama así — tener el mismo nombre en ambos
  // proyectos es razonable y evita renombrarlo en Vercel.
  const secret =
    process.env.INVENTARIO_WEBHOOK_SECRET || process.env.SHOP_WEBHOOK_SECRET;
  const tenant = process.env.INVENTARIO_TENANT_ID || "sendero3d";

  if (!url || !secret) {
    throw new Error(
      "Faltan variables de entorno del inventario: INVENTARIO_WEBHOOK_URL y/o INVENTARIO_WEBHOOK_SECRET (o SHOP_WEBHOOK_SECRET)"
    );
  }

  return { url, secret, tenant };
}

// ---------- Tipos ----------

export interface InventarioCliente {
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  dni?: string | null;
}

export interface InventarioDireccion {
  calle?: string;
  numero?: string;
  piso?: string;
  depto?: string;
  ciudad?: string;
  provincia?: string;
  cp?: string;
  notas?: string;
}

export interface InventarioVarianteSeleccionada {
  grupo?: string;
  nombre: string;
  precio_extra?: number;
}

export interface InventarioItem {
  sku: string | null;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  opciones_seleccionadas?: InventarioVarianteSeleccionada[];
  subtotal?: number;
}

export interface PedidoInventarioPayload {
  evento: "pedido.confirmado";
  numero_pedido: string;
  estado_shop: "pago_confirmado" | "pedido_confirmado" | "pendiente_pago";
  cliente: InventarioCliente;
  direccion_envio?: InventarioDireccion;
  metodo_envio?: string | null;
  tipo_envio?: string | null;
  costo_envio: number;
  metodo_pago?: string | null;
  recargo_mp?: number;
  subtotal: number;
  total: number;
  sucursal_correo?: { id?: string; nombre?: string } | null;
  shop_url?: string;
  items: InventarioItem[];
}

/**
 * Evento genérico de cambio de estado. Payload mínimo a propósito: el
 * Inventario ya tiene el pedido, y reenviar los items solo abre la puerta a
 * que los dos lados discrepen. `fecha` es cuándo cambió el estado, no cuándo
 * sale el aviso.
 */
export interface EstadoCambiadoPayload {
  evento: "pedido.estado_cambiado";
  numero_pedido: string;
  estado_shop: string;
  fecha: string;
}

/** 200 del evento de estado: `ok` si actuó, `ignorado` si no maneja ese estado. */
export interface RespuestaEstado {
  ok?: boolean;
  ignorado?: unknown;
  [clave: string]: unknown;
}

export interface RespuestaInventario {
  ok: true;
  pedidoId: string;
  estado: string;
  warnings?: string[];
  revision_manual?: boolean;
  duplicate?: boolean;
}

// ---------- Errores ----------

export class InventarioWebhookError extends Error {
  status: number;
  responseBody: unknown;
  constructor(message: string, status: number, responseBody: unknown) {
    super(message);
    this.name = "InventarioWebhookError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

// ---------- Cliente ----------

/**
 * Firma y manda un evento al inventario. Lanza `InventarioWebhookError` con
 * status y cuerpo de respuesta si el inventario responde no-OK. Si no
 * responde en 10 segundos, lanza un error sin status (cuenta como transitorio
 * para los reintentos).
 */
async function postFirmado<T>(payload: object): Promise<T> {
  const { url, secret, tenant } = getConfig();

  // El cuerpo se firma EXACTAMENTE como se envía. No re-serializar después.
  const rawBody = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-shop-signature": signature,
      "x-shop-timestamp": timestamp,
      "x-shop-tenant": tenant,
    },
    body: rawBody,
    signal: AbortSignal.timeout(10_000),
  });

  // Capturar texto crudo primero — algunos errores no son JSON
  const rawText = await response.text();
  let body: unknown = null;
  try {
    body = rawText ? JSON.parse(rawText) : null;
  } catch {
    body = rawText;
  }

  if (!response.ok) {
    const b = body as Record<string, unknown> | null;
    const msg =
      (b && typeof b === "object" && (b.error as string)) ||
      (b && typeof b === "object" && (b.message as string)) ||
      (typeof body === "string" && body.slice(0, 400)) ||
      "sin detalle";
    throw new InventarioWebhookError(
      `Webhook inventario falló (${response.status}): ${msg}`,
      response.status,
      body
    );
  }

  return body as T;
}

/** Manda un pedido entero (`pedido.confirmado`). */
export async function enviarPedidoAInventario(
  payload: PedidoInventarioPayload
): Promise<RespuestaInventario> {
  return postFirmado<RespuestaInventario>(payload);
}

/** Manda un cambio de estado (`pedido.estado_cambiado`). */
export async function enviarEstadoAInventario(
  payload: EstadoCambiadoPayload
): Promise<RespuestaEstado> {
  return postFirmado<RespuestaEstado>(payload);
}

/**
 * Reintenta con backoff exponencial (1 s, 2 s, ...) los errores transitorios:
 * 5xx, timeout o red. NO reintenta 4xx: son errores del shop, del secret o de
 * datos, y reintentar es ruido.
 */
export async function conReintentos<T>(enviar: () => Promise<T>, maxIntentos = 3): Promise<T> {
  let ultimoError: unknown;

  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      return await enviar();
    } catch (err) {
      ultimoError = err;
      const status =
        err instanceof InventarioWebhookError ? err.status : undefined;
      const esCliente = status !== undefined && status >= 400 && status < 500;
      if (esCliente || intento === maxIntentos) throw err;
      // Backoff: 1s, 2s, 4s, ...
      await new Promise((r) => setTimeout(r, 2 ** (intento - 1) * 1000));
    }
  }

  // Inalcanzable, pero TS necesita el throw
  throw ultimoError;
}

/** El pedido entero con reintentos. Lo usa el botón "Enviar a Inventario". */
export async function enviarConReintentos(
  payload: PedidoInventarioPayload,
  maxIntentos = 3
): Promise<RespuestaInventario> {
  return conReintentos(() => enviarPedidoAInventario(payload), maxIntentos);
}
