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
