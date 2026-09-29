import "server-only";
import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import type { createServiceRoleClient } from "@/lib/supabase-server";
import { ipDe } from "@/lib/limite";

/**
 * Analítica propia, lado servidor (SHOP - Analítica propia). Lo usan
 * /api/pulso (eventos del navegador) y /api/pedidos (el evento "pedido").
 */

type Db = Awaited<ReturnType<typeof createServiceRoleClient>>;

export type TipoEvento = "vista" | "producto" | "carrito" | "checkout" | "busqueda" | "whatsapp" | "pedido";

export interface EventoAnalitica {
  tipo: TipoEvento;
  ruta: string | null;
  producto_id?: string | null;
  cantidad?: number | null;
  termino?: string | null;
  resultados?: number | null;
  origen: string;
  campania: string | null;
}

/**
 * Solo se mide en producción: los previews y el `next start` local apuntan a
 * la misma base y ensuciarían los números. ANALITICA_EN_LOCAL=1 lo habilita
 * para probar.
 */
export function medirEnEsteEntorno(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.ANALITICA_EN_LOCAL === "1";
}

function diaArgentina(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

/**
 * Código del visitante: hash del día, la IP y el navegador, con una sal que
 * no sale del servidor. Cuenta personas distintas por día sin guardar la IP
 * ni poder seguir a nadie de un día al otro (el mismo método que Plausible).
 */
export function visitanteDe(req: NextRequest): string {
  const sal = process.env.ANALITICA_SAL || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createHash("sha256")
    .update(`${sal}|${diaArgentina()}|${ipDe(req)}|${req.headers.get("user-agent") ?? ""}`)
    .digest("hex")
    .slice(0, 20);
}

export function dispositivoDe(req: NextRequest): string {
  return /Mobi|Android|iPhone|iPad/i.test(req.headers.get("user-agent") ?? "") ? "celular" : "computadora";
}

/** Código ISO 3166-2:AR de la provincia (lo manda Vercel) → nombre. */
const PROVINCIAS: Record<string, string> = {
  A: "Salta", B: "Buenos Aires", C: "CABA", D: "San Luis", E: "Entre Ríos", F: "La Rioja",
  G: "Santiago del Estero", H: "Chaco", J: "San Juan", K: "Catamarca", L: "La Pampa", M: "Mendoza",
  N: "Misiones", P: "Formosa", Q: "Neuquén", R: "Río Negro", S: "Santa Fe", T: "Tucumán",
  U: "Chubut", V: "Tierra del Fuego", W: "Corrientes", X: "Córdoba", Y: "Jujuy", Z: "Santa Cruz",
};

export function regionDe(req: NextRequest): string | null {
  const pais = req.headers.get("x-vercel-ip-country");
  if (!pais) return null;
  if (pais !== "AR") return "Exterior";
  const codigo = (req.headers.get("x-vercel-ip-country-region") ?? "").toUpperCase();
  return PROVINCIAS[codigo] ?? null;
}

/** Robots que ejecutan JavaScript (vistas previas, analizadores). No son personas. */
export function esRobot(req: NextRequest): boolean {
  return /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|curl|wget|python/i.test(
    req.headers.get("user-agent") ?? ""
  );
}

/** Con sesión en el panel: es el dueño mirando la tienda, no un cliente. */
export function esSesionDelPanel(req: NextRequest): boolean {
  return req.cookies.getAll().some((c) => /^sb-.+-auth-token/.test(c.name));
}

export function paginaDe(ruta: string | null): string {
  if (!ruta) return "otra";
  if (ruta === "/") return "home";
  const primero = ruta.split("/")[1];
  if (["catalogo", "producto", "coleccion", "checkout", "pedido", "contacto", "mi-pedido"].includes(primero)) return primero;
  return "otra";
}

export async function registrarEvento(db: Db, req: NextRequest, e: EventoAnalitica) {
  const { error } = await db.rpc("registrar_evento", {
    p_visitante: visitanteDe(req),
    p_tipo: e.tipo,
    p_ruta: e.ruta,
    p_pagina: paginaDe(e.ruta),
    p_producto_id: e.producto_id ?? null,
    p_cantidad: e.cantidad ?? null,
    p_termino: e.termino ?? null,
    p_resultados: e.resultados ?? null,
    p_origen: e.origen,
    p_campania: e.campania,
    p_dispositivo: dispositivoDe(req),
    p_region: regionDe(req),
  });
  if (error) console.error("[analitica] no se pudo registrar:", error.message);
}
