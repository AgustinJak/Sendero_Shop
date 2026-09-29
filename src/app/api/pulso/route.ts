import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import {
  esRobot,
  esSesionDelPanel,
  medirEnEsteEntorno,
  registrarEvento,
  type TipoEvento,
} from "@/lib/analitica-servidor";
import { limpiarCampania, limpiarOrigen } from "@/lib/origen";

/**
 * Eventos de la analítica propia que manda el navegador (lib/pulso.ts). Ver
 * SHOP - Analítica propia.
 *
 * Responde siempre 204, sin detalle: el navegador no espera nada y a quien
 * mande basura no hay que explicarle por qué no se guardó. Lo que no pasa la
 * validación se descarta. El tope por visitante y día está en la base
 * (`registrar_evento`).
 */

const TIPOS = new Set<TipoEvento>(["vista", "producto", "carrito", "checkout", "busqueda", "whatsapp"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nada = () => new NextResponse(null, { status: 204 });

function entero(v: unknown, min: number, max: number): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export async function POST(req: NextRequest) {
  if (!medirEnEsteEntorno() || esRobot(req) || esSesionDelPanel(req)) return nada();

  let d: Record<string, unknown>;
  try {
    d = JSON.parse((await req.text()).slice(0, 2000));
  } catch {
    return nada();
  }

  const tipo = d.tipo as TipoEvento;
  if (!TIPOS.has(tipo)) return nada();

  const ruta = typeof d.ruta === "string" && d.ruta.startsWith("/") ? d.ruta.split(/[?#]/)[0].slice(0, 200) : null;
  if (!ruta || ruta.startsWith("/admin")) return nada();

  const productoId = typeof d.producto_id === "string" && UUID.test(d.producto_id) ? d.producto_id : null;
  const termino =
    tipo === "busqueda" && typeof d.termino === "string"
      ? d.termino.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 80) || null
      : null;
  if (tipo === "busqueda" && !termino) return nada();

  try {
    const db = await createServiceRoleClient();
    await registrarEvento(db, req, {
      tipo,
      ruta,
      producto_id: productoId,
      cantidad: tipo === "carrito" ? entero(d.cantidad, 1, 999) : null,
      termino,
      resultados: tipo === "busqueda" ? entero(d.resultados, 0, 10_000) : null,
      origen: limpiarOrigen(d.origen) ?? "directo",
      campania: limpiarCampania(d.campania),
    });
  } catch (err) {
    console.error("[pulso]", (err as Error).message);
  }
  return nada();
}
