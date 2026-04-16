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

export interface CorreoSenderAddress {
  streetName: string;
  streetNumber: string;
  floor?: string;
  apartment?: string;
  locality: string;
  province: string; // Province code (A, B, C, ...)
  postalCode: string;
}

export interface CorreoParty {
  name: string;
  surname?: string;
  documentType?: string; // "DNI" | "CUIT" | ...
  documentNumber: string;
  telephone: string;
  email: string;
  address: CorreoSenderAddress;
}

export interface CorreoImportShipment {
  deliveredType: "D" | "S";
  productType?: string; // default "CP"
  externalReference: string; // Usually nro de pedido
  declaredValue: number;
  dimensions: {
    weight: number;
    height: number;
    width: number;
    length: number;
  };
  addressee: CorreoParty;
  agencyId?: string; // required if deliveredType === "S"
}

export interface CorreoImportResult {
  ok: boolean;
  status: number;
  shippingId?: string;
  createdAt?: string;
  raw: unknown;
}

/**
 * Build the sender (remitente) from environment variables.
 * These must be configured once in .env / Vercel.
 */
function getRemitente(): CorreoParty {
  const required = {
    CORREO_REMITENTE_NOMBRE: process.env.CORREO_REMITENTE_NOMBRE,
    CORREO_REMITENTE_DNI: process.env.CORREO_REMITENTE_DNI,
    CORREO_REMITENTE_TELEFONO: process.env.CORREO_REMITENTE_TELEFONO,
    CORREO_REMITENTE_EMAIL: process.env.CORREO_REMITENTE_EMAIL,
    CORREO_REMITENTE_CALLE: process.env.CORREO_REMITENTE_CALLE,
    CORREO_REMITENTE_NUMERO: process.env.CORREO_REMITENTE_NUMERO,
    CORREO_REMITENTE_LOCALIDAD: process.env.CORREO_REMITENTE_LOCALIDAD,
    CORREO_REMITENTE_PROVINCIA: process.env.CORREO_REMITENTE_PROVINCIA, // province code
    CORREO_REMITENTE_CP: process.env.CORREO_REMITENTE_CP,
  };

  const missing = Object.entries(required)
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de remitente de Correo Argentino: ${missing.join(", ")}`
    );
  }

  return {
    name: required.CORREO_REMITENTE_NOMBRE!,
    surname: process.env.CORREO_REMITENTE_APELLIDO || undefined,
    documentType: process.env.CORREO_REMITENTE_DOC_TIPO || "DNI",
    documentNumber: required.CORREO_REMITENTE_DNI!,
    telephone: required.CORREO_REMITENTE_TELEFONO!,
    email: required.CORREO_REMITENTE_EMAIL!,
    address: {
      streetName: required.CORREO_REMITENTE_CALLE!,
      streetNumber: required.CORREO_REMITENTE_NUMERO!,
      floor: process.env.CORREO_REMITENTE_PISO || undefined,
      apartment: process.env.CORREO_REMITENTE_DEPTO || undefined,
      locality: required.CORREO_REMITENTE_LOCALIDAD!,
      province: required.CORREO_REMITENTE_PROVINCIA!,
      postalCode: required.CORREO_REMITENTE_CP!,
    },
  };
}

/**
 * Import a shipment into MiCorreo so it appears ready to manage in
 * the Correo Argentino platform.
 *
 * Endpoint: POST /shipping/import
 * The exact payload shape is inferred from MiCorreo docs — adjust if
 * the API returns 400 with a specific field error.
 */
export async function importShipping(
  shipment: CorreoImportShipment
): Promise<CorreoImportResult> {
  const { baseUrl, customerId } = getConfig();
  const token = await getToken();
  const sender = getRemitente();

  const body = {
    customerId,
    deliveredType: shipment.deliveredType,
    productType: shipment.productType || "CP",
    externalReference: shipment.externalReference,
    declaredValue: shipment.declaredValue,
    dimensions: shipment.dimensions,
    sender: {
      name: sender.name,
      surname: sender.surname,
      document: {
        type: sender.documentType,
        number: sender.documentNumber,
      },
      telephone: sender.telephone,
      email: sender.email,
      address: sender.address,
    },
    addressee: {
      name: shipment.addressee.name,
      surname: shipment.addressee.surname,
      document: {
        type: shipment.addressee.documentType || "DNI",
        number: shipment.addressee.documentNumber,
      },
      telephone: shipment.addressee.telephone,
      email: shipment.addressee.email,
      address: shipment.addressee.address,
    },
    ...(shipment.deliveredType === "S" && shipment.agencyId
      ? { agencyId: shipment.agencyId }
      : {}),
  };

  const res = await fetch(`${baseUrl}/shipping/import`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      (raw as { message?: string; error?: string })?.message ||
      (raw as { error?: string })?.error ||
      `HTTP ${res.status}`;
    throw new Error(`Correo Argentino import failed (${res.status}): ${msg}`);
  }

  // The API usually returns { createdAt, trackingNumber?, shippingId? } or array
  const data = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown>;

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
