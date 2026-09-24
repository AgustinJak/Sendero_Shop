import "server-only";
import { cotizar } from "@/lib/correo-argentino";
import type { createServiceRoleClient } from "@/lib/supabase-server";

type Db = Awaited<ReturnType<typeof createServiceRoleClient>>;

/**
 * Costo de envío de Correo Argentino calculado en el servidor.
 *
 * Antes se tomaba el `costoEnvio` que mandaba el checkout: con `1`, el envío
 * costaba $1 (SHOP - Seguridad, punto 4). Ahora el servidor arma el paquete con
 * las medidas de la base y le pregunta a Correo.
 *
 * El paquete se arma con LA MISMA fórmula que el checkout (CheckoutForm), así
 * el precio que se cobra es el que vio el cliente. Si se cambia una, cambiar la
 * otra.
 */
export async function paqueteDelPedido(
  db: Db,
  items: { producto_id: string | null; cantidad: number }[]
): Promise<{ weight: number; height: number; width: number; length: number }> {
  const ids = [...new Set(items.map((i) => i.producto_id).filter((x): x is string => !!x))];
  type Medidas = { id: string; peso_gr: number | null; alto_cm: number | null; ancho_cm: number | null; largo_cm: number | null };
  const { data } = ids.length
    ? await db.from("productos").select("id, peso_gr, alto_cm, ancho_cm, largo_cm").in("id", ids)
    : { data: [] as Medidas[] };
  const porId = new Map(((data ?? []) as Medidas[]).map((p) => [p.id, p]));

  let peso = 0;
  let alto = 0;
  let ancho = 0;
  let largo = 0;
  for (const item of items) {
    const p = item.producto_id ? porId.get(item.producto_id) : undefined;
    peso += (p?.peso_gr ?? 500) * item.cantidad; // 500 g si no tiene
    alto = Math.max(alto, p?.alto_cm ?? 15);
    ancho = Math.max(ancho, p?.ancho_cm ?? 15);
    largo += (p?.largo_cm ?? 10) * item.cantidad; // se suman apilados
  }

  return {
    weight: peso || 500,
    height: alto || 15,
    width: ancho || 15,
    length: Math.min(largo || 10, 150), // máximo razonable
  };
}

export type ResultadoEnvioCorreo =
  | { ok: true; precio: number }
  | { ok: false; status: number; error: string };

/** Cotiza la modalidad elegida (domicilio o sucursal) para ese CP y esos items. */
export async function costoEnvioCorreo(
  db: Db,
  codigoPostal: unknown,
  tipoEnvio: unknown,
  items: { producto_id: string | null; cantidad: number }[]
): Promise<ResultadoEnvioCorreo> {
  const cp = String(codigoPostal ?? "").match(/\d{4}/)?.[0];
  if (!cp) return { ok: false, status: 400, error: "Código postal inválido" };

  const paquete = await paqueteDelPedido(db, items);
  let cotizacion;
  try {
    cotizacion = await cotizar(cp, paquete);
  } catch (err) {
    // Sin cotización no hay precio confiable: se pide reintentar en vez de
    // aceptar el del navegador. Es raro, y el checkout mismo tampoco habría
    // podido cotizar en ese momento.
    console.error("[envio] Correo no respondió al confirmar el pedido:", (err as Error).message);
    return {
      ok: false,
      status: 503,
      error: "No pudimos confirmar el costo del envío con Correo Argentino. Probá de nuevo en un momento.",
    };
  }

  const opcion = tipoEnvio === "sucursal" ? cotizacion.sucursal : cotizacion.domicilio;
  if (!opcion || !(opcion.price > 0)) {
    return { ok: false, status: 400, error: "Correo Argentino no ofrece esa modalidad para ese código postal." };
  }
  return { ok: true, precio: Number(opcion.price) };
}
