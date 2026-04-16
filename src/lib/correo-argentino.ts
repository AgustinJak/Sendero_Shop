/**
 * Correo Argentino MiCorreo API Client
 *
 * Handles authentication (JWT with auto-refresh), cotización and agency lookup.
 * Designed to run server-side only (API routes).
 */

// ---------- Types ----------

export interface CorreoRate {
  productName: string;
  productType: string;
  deliveredType: "D" | "S"; // D = domicilio, S = sucursal
  price: number;
  deliveryTimeMin?: number;
  deliveryTimeMax?: number;
}

export interface CorreoCotizacion {
  domicilio: CorreoRate | null;
  sucursal: CorreoRate | null;
  rates: CorreoRate[];
}

export interface CorreoAgencia {
  agencyId: string;
  agencyName: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  schedule: string;
  latitude: number | null;
  longitude: number | null;
  services: string[];
}

// ---------- Config ----------

function getConfig() {
  const baseUrl = process.env.CORREO_API_BASE_URL;
  const user = process.env.CORREO_API_USER;
  const password = process.env.CORREO_API_PASSWORD;
  const customerId = process.env.CORREO_CUSTOMER_ID;
  const cpOrigen = process.env.CORREO_CP_ORIGEN || "1414";

  if (!baseUrl || !user || !password || !customerId) {
    throw new Error(
      "Faltan variables de entorno de Correo Argentino: CORREO_API_BASE_URL, CORREO_API_USER, CORREO_API_PASSWORD, CORREO_CUSTOMER_ID"
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), user, password, customerId, cpOrigen };
}

// ---------- Token cache ----------

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0; // unix ms

/**
 * Obtain a JWT token, using the cached one if still valid.
 * Renews 60s before expiration.
 */
async function getToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && tokenExpiresAt - now > 60_000) {
    return cachedToken;
  }

  const { baseUrl, user, password } = getConfig();
  const credentials = Buffer.from(`${user}:${password}`).toString("base64");

  const res = await fetch(`${baseUrl}/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Correo Argentino auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  // The API returns { token: "...", expire: "2026-04-15 17:46:17" }
  cachedToken = data.token;

  // Parse expiration — field is "expire" (string datetime)
  const expireField = data.expire || data.expiration;
  if (expireField) {
    const exp =
      typeof expireField === "number"
        ? expireField * 1000
        : new Date(expireField).getTime();
    tokenExpiresAt = isNaN(exp) ? now + 3600_000 : exp;
  } else {
    // Default: assume 1 hour validity
    tokenExpiresAt = now + 3600_000;
  }

  return cachedToken!;
}

// ---------- Cotización cache ----------

const cotizacionCache = new Map<string, { data: CorreoCotizacion; expiresAt: number }>();
const COTIZACION_TTL = 30 * 60 * 1000; // 30 minutes

// ---------- Dimensions defaults ----------

// Default package dimensions — can be overridden per product in the future
const DEFAULT_WEIGHT = 500; // grams
const DEFAULT_HEIGHT = 15; // cm
const DEFAULT_WIDTH = 15;
const DEFAULT_LENGTH = 10;

// ---------- Public functions ----------

/**
 * Get shipping rates for a destination postal code.
 * Returns both domicilio and sucursal rates.
 * Results are cached for 30 minutes per CP.
 */
export async function cotizar(
  cpDestino: string,
  options?: {
    weight?: number;
    height?: number;
    width?: number;
    length?: number;
  }
): Promise<CorreoCotizacion> {
  const w = options?.weight ?? DEFAULT_WEIGHT;
  const h = options?.height ?? DEFAULT_HEIGHT;
  const wi = options?.width ?? DEFAULT_WIDTH;
  const l = options?.length ?? DEFAULT_LENGTH;
  const cacheKey = `${cpDestino}-${w}-${h}-${wi}-${l}`;
  const cached = cotizacionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const { baseUrl, customerId, cpOrigen } = getConfig();
  const token = await getToken();

  const body = {
    customerId,
    postalCodeOrigin: cpOrigen,
    postalCodeDestination: cpDestino,
    // No deliveredType → returns both D and S
    dimensions: {
      weight: options?.weight ?? DEFAULT_WEIGHT,
      height: options?.height ?? DEFAULT_HEIGHT,
      width: options?.width ?? DEFAULT_WIDTH,
      length: options?.length ?? DEFAULT_LENGTH,
    },
  };

  const res = await fetch(`${baseUrl}/rates`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Correo Argentino rates failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // Parse rates array
  const rawRates: CorreoRate[] = (data.rates || []).map((r: Record<string, unknown>) => ({
    productName: r.productName as string || "",
    productType: r.productType as string || "",
    deliveredType: r.deliveredType as "D" | "S",
    price: Number(r.price) || 0,
    deliveryTimeMin: r.deliveryTimeMin != null ? Number(r.deliveryTimeMin) : undefined,
    deliveryTimeMax: r.deliveryTimeMax != null ? Number(r.deliveryTimeMax) : undefined,
  }));

  // Pick the cheapest option for each delivery type
  const domicilioRates = rawRates.filter((r) => r.deliveredType === "D");
  const sucursalRates = rawRates.filter((r) => r.deliveredType === "S");

  const cheapest = (rates: CorreoRate[]) =>
    rates.length > 0
      ? rates.reduce((min, r) => (r.price < min.price ? r : min))
      : null;

  const result: CorreoCotizacion = {
    domicilio: cheapest(domicilioRates),
    sucursal: cheapest(sucursalRates),
    rates: rawRates,
  };

  // Cache
  cotizacionCache.set(cacheKey, {
    data: result,
    expiresAt: Date.now() + COTIZACION_TTL,
  });

  // Cleanup old entries
  if (cotizacionCache.size > 500) {
    const now = Date.now();
    for (const [key, val] of cotizacionCache) {
      if (val.expiresAt < now) cotizacionCache.delete(key);
    }
  }

  return result;
}

/**
 * List pickup agencies for a given province code.
 * Province codes: A=Salta, B=BsAs, C=CABA, etc.
 */
export async function listarSucursales(
  provinceCode: string
): Promise<CorreoAgencia[]> {
  const { baseUrl, customerId } = getConfig();
  const token = await getToken();

  const params = new URLSearchParams({
    customerId,
    provinceCode,
  });

  const res = await fetch(`${baseUrl}/agencies?${params}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Correo Argentino agencies failed (${res.status}): ${text}`);
  }

  const data = await res.json();

  // The API returns an array directly (not wrapped in a key)
  const rawList = Array.isArray(data) ? data : (data.agencies || []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agencies: CorreoAgencia[] = rawList.map((a: any) => {
    const loc = a.location || {};
    const addr = loc.address || {};
    const street = [addr.streetName, addr.streetNumber].filter(Boolean).join(" ");
    const city = addr.city || addr.locality || "";
    const province = addr.province || "";
    const postalCode = String(a.nearByPostalCode || addr.postalCode || "");

    // Parse services
    const svc = a.services || {};
    const servicesList: string[] = [];
    if (svc.pickupAvailability) servicesList.push("pickup");
    if (svc.packageReception) servicesList.push("reception");

    // Parse hours — could be object with days as keys
    let schedule = "";
    if (a.hours) {
      if (typeof a.hours === "string") {
        schedule = a.hours;
      } else if (typeof a.hours === "object") {
        const dayNames: Record<string, string> = {
          monday: "Lun", tuesday: "Mar", wednesday: "Mié",
          thursday: "Jue", friday: "Vie", saturday: "Sáb", sunday: "Dom",
        };
        const parsed = Object.entries(a.hours)
          .filter(([, v]) => v && typeof v === "object" && (v as any).open && (v as any).open !== "-")
          .map(([day, v]: [string, any]) => `${dayNames[day] || day} ${v.open}-${v.close}`);
        schedule = parsed.length > 0 ? parsed.join(", ") : "";
      }
    }

    return {
      agencyId: String(a.code || ""),
      agencyName: String(a.name || ""),
      address: street,
      city,
      province,
      postalCode,
      phone: String(a.phone || ""),
      schedule,
      latitude: loc.latitude != null ? Number(loc.latitude) : null,
      longitude: loc.longitude != null ? Number(loc.longitude) : null,
      services: servicesList,
    };
  });

  // Only return agencies with pickup availability
  return agencies.filter(
    (a) => a.services.includes("pickup") && a.agencyName
  );
}

// ---------- Shipping import (Fase 2) ----------

export interface CorreoImportAddress {
  streetName: string;
  streetNumber: string;
  floor?: string;
  apartment?: string;
  city: string;
  provinceCode: string; // Province code (A, B, C, ...)
  postalCode: string;
}

export interface CorreoImportRecipient {
  name: string;
  phone?: string;
  cellPhone?: string;
  email: string;
}

export interface CorreoImportShipment {
  deliveryType: "D" | "S";
  agency?: string; // required when deliveryType === "S"
  address: CorreoImportAddress;
  weight: number; // grams, integer
  declaredValue: number;
  height: number; // cm, integer
  length: number; // cm, integer
  width: number; // cm, integer
}

export interface CorreoImportInput {
  extOrderId?: string;
  orderNumber?: string;
  recipient: CorreoImportRecipient;
  shipping: CorreoImportShipment;
}

export interface CorreoImportResult {
  ok: boolean;
  status: number;
  shippingId?: string;
  createdAt?: string;
  raw: unknown;
}

/**
 * Build the sender block for /shipping/import.
 * Per the MiCorreo docs, all sender fields can be null — in that case
 * MiCorreo uses the sender stored against `customerId`.
 * We still fill them from env vars if they are present, so the shipment
 * shows the right remitente info in the platform.
 */
function buildSender() {
  const sender = {
    name: process.env.CORREO_REMITENTE_NOMBRE || null,
    phone: process.env.CORREO_REMITENTE_TELEFONO || null,
    cellPhone:
      process.env.CORREO_REMITENTE_CELULAR ||
      process.env.CORREO_REMITENTE_TELEFONO ||
      null,
    email: process.env.CORREO_REMITENTE_EMAIL || null,
    originAddress: {
      streetName: process.env.CORREO_REMITENTE_CALLE || null,
      streetNumber: process.env.CORREO_REMITENTE_NUMERO || null,
      floor: process.env.CORREO_REMITENTE_PISO || null,
      apartment: process.env.CORREO_REMITENTE_DEPTO || null,
      city:
        process.env.CORREO_REMITENTE_CIUDAD ||
        process.env.CORREO_REMITENTE_LOCALIDAD ||
        null,
      provinceCode: process.env.CORREO_REMITENTE_PROVINCIA || null,
      postalCode: process.env.CORREO_REMITENTE_CP || null,
    },
  };
  return sender;
}

/**
 * Import a shipment into MiCorreo so it appears ready to manage in
 * the Correo Argentino platform.
 *
 * Endpoint: POST /shipping/import
 * Schema (per MiCorreo API docs, version 2022-08):
 *   { customerId, extOrderId, orderNumber, sender, recipient, shipping }
 * where:
 *   - sender: { name, phone, cellPhone, email, originAddress: {...} } — nullable
 *   - recipient: { name, phone, cellPhone, email } — NO address, NO document
 *   - shipping: { deliveryType, agency, address: {streetName, streetNumber,
 *       floor, apartment, city, provinceCode, postalCode}, weight,
 *       declaredValue, height, length, width }
 */
export async function importShipping(
  input: CorreoImportInput
): Promise<CorreoImportResult> {
  const { baseUrl, customerId } = getConfig();
  const token = await getToken();

  const { shipping } = input;
  const body = {
    customerId,
    extOrderId: input.extOrderId ?? null,
    orderNumber: input.orderNumber ?? null,
    sender: buildSender(),
    recipient: {
      name: input.recipient.name,
      phone: input.recipient.phone ?? "",
      cellPhone: input.recipient.cellPhone ?? input.recipient.phone ?? "",
      email: input.recipient.email,
    },
    shipping: {
      deliveryType: shipping.deliveryType,
      agency: shipping.deliveryType === "S" ? shipping.agency ?? null : null,
      address: {
        streetName: shipping.address.streetName,
        streetNumber: shipping.address.streetNumber,
        floor: shipping.address.floor ?? "",
        apartment: shipping.address.apartment ?? "",
        city: shipping.address.city,
        provinceCode: shipping.address.provinceCode,
        postalCode: shipping.address.postalCode,
      },
      weight: Math.round(shipping.weight),
      declaredValue: shipping.declaredValue,
      height: Math.round(shipping.height),
      length: Math.round(shipping.length),
      width: Math.round(shipping.width),
    },
  };

  const res = await fetch(`${baseUrl}/shipping/import`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // Capture raw text first — then try to parse as JSON
  const rawText = await res.text();
  let raw: unknown = null;
  try {
    raw = rawText ? JSON.parse(rawText) : null;
  } catch {
    raw = rawText;
  }

  if (!res.ok) {
    // Log full detail on server so we can debug
    console.error("[Correo] /shipping/import failed", {
      status: res.status,
      requestBody: body,
      responseText: rawText,
      responseParsed: raw,
    });

    // Try to extract a human-readable message from several common shapes
    const r = raw as Record<string, unknown> | null;
    let msg: string | undefined;
    if (r && typeof r === "object") {
      msg =
        (r.message as string) ||
        (r.error as string) ||
        (r.errorMessage as string) ||
        (Array.isArray(r.errors)
          ? (r.errors as unknown[])
              .map((e) =>
                typeof e === "string"
                  ? e
                  : (e as { message?: string; field?: string; code?: string })?.message ||
                    JSON.stringify(e)
              )
              .join("; ")
          : undefined);
    }
    if (!msg && typeof raw === "string" && raw.trim()) {
      msg = raw.slice(0, 400);
    }
    throw new Error(
      `Correo Argentino import failed (${res.status}): ${msg || "sin detalle en la respuesta"}`
    );
  }

  // The API usually returns { createdAt, trackingNumber?, shippingId? } or array
  const data = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | null;

  return {
    ok: true,
    status: res.status,
    shippingId:
      (data?.shippingId as string) ||
      (data?.trackingNumber as string) ||
      (data?.id as string) ||
      undefined,
    createdAt: (data?.createdAt as string) || undefined,
    raw,
  };
}

// ---------- Province code mapping ----------

/**
 * Map from user-facing province name to Correo Argentino province code.
 */
export const PROVINCIA_A_CODIGO: Record<string, string> = {
  Salta: "A",
  "Buenos Aires": "B",
  CABA: "C",
  "San Luis": "D",
  "Entre Ríos": "E",
  "La Rioja": "F",
  "Santiago del Estero": "G",
  Chaco: "H",
  "San Juan": "J",
  Catamarca: "K",
  "La Pampa": "L",
  Mendoza: "M",
  Misiones: "N",
  Formosa: "P",
  Neuquén: "Q",
  "Río Negro": "R",
  "Santa Fe": "S",
  Tucumán: "T",
  Chubut: "U",
  "Tierra del Fuego": "V",
  Corrientes: "W",
  Córdoba: "X",
  Jujuy: "Y",
  "Santa Cruz": "Z",
};
