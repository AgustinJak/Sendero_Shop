import "server-only";
import { createHash } from "crypto";
import type { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { ipDe } from "@/lib/limite";

/**
 * Compras a Meta Ads por la API de conversiones. Ver "SHOP - Integración Meta
 * Ads" en el vault.
 *
 * El navegador no puede avisar la compra: cuando el cliente confirma, el
 * pedido solo está creado, y el pago llega después (webhook de MP, o el admin
 * confirmando una transferencia o una seña, a veces días más tarde). Así que
 * el Purchase lo manda el servidor en el momento en que el pedido pasa a
 * `pago_confirmado`, con los datos que se guardaron al crearlo.
 *
 * Variables: NEXT_PUBLIC_META_PIXEL_ID y META_CAPI_TOKEN. Sin alguna de las
 * dos no hace nada. META_TEST_EVENT_CODE manda todo a "Probar eventos" del
 * administrador de eventos: sacarla al terminar de probar, o las compras
 * reales no cuentan.
 */

const VERSION_API = "v26.0";
const SITIO = "https://sendero3d.com";

type Db = Awaited<ReturnType<typeof createServiceRoleClient>>;

/** fb.<n>.<ms>.<valor>: el formato de _fbp y _fbc. */
const COOKIE_META = /^fb\.\d\.\d{10,13}\.[^\s;]{1,500}$/;

/**
 * Guarda las cookies del píxel, la IP y el navegador de quien crea el pedido.
 * `pagina` es la ruta desde donde se compró, sin datos privados (nunca el
 * token de un pedido a medida).
 */
export async function guardarAtribucionMeta(db: Db, pedidoId: string, req: NextRequest, pagina: string) {
  if (!process.env.NEXT_PUBLIC_META_PIXEL_ID) return;

  const cookie = (nombre: string) => {
    const valor = req.cookies.get(nombre)?.value;
    return valor && COOKIE_META.test(valor) ? valor : null;
  };
  const ip = ipDe(req);

  const { error } = await db.from("pedido_meta_ads").insert({
    pedido_id: pedidoId,
    fbp: cookie("_fbp"),
    fbc: cookie("_fbc"),
    ip: ip === "desconocida" ? null : ip,
    user_agent: req.headers.get("user-agent")?.slice(0, 500) || null,
    url: `${SITIO}${pagina}`,
  });
  if (error) console.error("[meta] no se pudo guardar la atribución:", error.message);
}

const hash = (valor: string) => createHash("sha256").update(valor).digest("hex");

/** Minúsculas, sin tildes, sin espacios ni signos: lo que pide Meta para nombre, ciudad y provincia. */
function normalizar(valor: string) {
  return valor.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Meta pide el teléfono con código de país. Acá se escribe casi siempre sin
 * él ("1125502785"); con 10 dígitos se mandan las dos formas, celular
 * (549…) y fija (54…), porque no se sabe cuál tiene cargada la cuenta.
 */
function telefonosNormalizados(telefono: string): string[] {
  let d = telefono.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("54")) return [d];
  d = d.replace(/^0/, "");
  if (d.length === 10) return [`549${d}`, `54${d}`];
  return d.length >= 6 ? [`54${d}`] : [];
}

interface PedidoParaMeta {
  numero_pedido: string;
  email: string;
  telefono: string | null;
  nombre_cliente: string;
  direccion_envio: { localidad?: string; provincia?: string; codigo_postal?: string } | null;
  total: number | string;
  items: { producto_id: string | null; cantidad: number; precio_unitario: number | string }[] | null;
}

interface Atribucion {
  fbp: string | null;
  fbc: string | null;
  ip: string | null;
  user_agent: string | null;
  url: string;
}

/** El evento Purchase tal como lo pide la API de conversiones. */
export function armarCompra(pedidoId: string, pedido: PedidoParaMeta, atrib: Atribucion, ahora = Date.now()) {
  const email = pedido.email.trim().toLowerCase();
  const [nombre, ...resto] = pedido.nombre_cliente.trim().split(/\s+/);
  const apellido = resto.join(" ");
  const dir = pedido.direccion_envio;
  const cp = dir?.codigo_postal?.match(/\d{4}/)?.[0];
  const productos = (pedido.items ?? []).filter((i) => i.producto_id);

  const userData: Record<string, unknown> = {
    em: [hash(email)],
    external_id: [hash(email)],
    country: [hash("ar")],
  };
  const telefonos = telefonosNormalizados(pedido.telefono ?? "");
  if (telefonos.length) userData.ph = telefonos.map(hash);
  if (nombre && normalizar(nombre)) userData.fn = [hash(normalizar(nombre))];
  if (apellido && normalizar(apellido)) userData.ln = [hash(normalizar(apellido))];
  if (dir?.localidad && normalizar(dir.localidad)) userData.ct = [hash(normalizar(dir.localidad))];
  if (dir?.provincia && normalizar(dir.provincia)) userData.st = [hash(normalizar(dir.provincia))];
  if (cp) userData.zp = [hash(cp)];
  // Estos van sin hash: así los pide Meta.
  if (atrib.ip) userData.client_ip_address = atrib.ip;
  if (atrib.user_agent) userData.client_user_agent = atrib.user_agent;
  if (atrib.fbp) userData.fbp = atrib.fbp;
  if (atrib.fbc) userData.fbc = atrib.fbc;

  return {
    event_name: "Purchase",
    event_time: Math.floor(ahora / 1000),
    // Mismo id si algún día el navegador también manda la compra: Meta
    // descarta el duplicado.
    event_id: `compra-${pedidoId}`,
    action_source: "website",
    event_source_url: atrib.url,
    user_data: userData,
    custom_data: {
      currency: "ARS",
      value: Number(pedido.total),
      order_id: pedido.numero_pedido,
      content_type: "product",
      content_ids: productos.map((i) => i.producto_id),
      contents: productos.map((i) => ({
        id: i.producto_id,
        quantity: i.cantidad,
        item_price: Number(i.precio_unitario),
      })),
      num_items: (pedido.items ?? []).reduce((n, i) => n + i.cantidad, 0),
    },
  };
}

/**
 * Manda el Purchase de un pedido que se acaba de pagar. Se llama con `after()`
 * desde donde el pedido pasa a `pago_confirmado`: no demora la respuesta y
 * nunca tira error hacia afuera.
 *
 * Sale una sola vez por pedido, y solo si el pedido tiene atribución guardada
 * (los anteriores al píxel no tienen). Después de mandarla se borran las
 * cookies, la IP y el navegador: ya no hacen falta.
 */
export async function enviarCompraAMeta(pedidoId: string): Promise<void> {
  const pixel = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  if (!pixel || !token) return;

  let db: Db;
  try {
    db = await createServiceRoleClient();
  } catch (err) {
    console.error("[meta] sin base:", (err as Error).message);
    return;
  }

  // Se reserva el envío antes de mandarlo: si dos confirmaciones llegan
  // juntas, solo una encuentra compra_enviada_at vacío.
  const { data: reservadas } = await db
    .from("pedido_meta_ads")
    .update({ compra_enviada_at: new Date().toISOString() })
    .eq("pedido_id", pedidoId)
    .is("compra_enviada_at", null)
    .select("fbp, fbc, ip, user_agent, url");
  const atrib = reservadas?.[0] as Atribucion | undefined;
  if (!atrib) return;

  let respuesta: string;
  try {
    const { data: pedido } = await db
      .from("pedidos")
      .select("numero_pedido, email, telefono, nombre_cliente, direccion_envio, total, items:pedido_items(producto_id, cantidad, precio_unitario)")
      .eq("id", pedidoId)
      .single();
    if (!pedido) throw new Error("pedido no encontrado");

    const res = await fetch(`https://graph.facebook.com/${VERSION_API}/${pixel}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [armarCompra(pedidoId, pedido as unknown as PedidoParaMeta, atrib)],
        access_token: token,
        ...(process.env.META_TEST_EVENT_CODE && { test_event_code: process.env.META_TEST_EVENT_CODE }),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const texto = (await res.text()).slice(0, 500);
    respuesta = res.ok ? texto : `HTTP ${res.status}: ${texto}`;
    if (!res.ok) console.error(`[meta] Meta rechazó la compra de ${pedido.numero_pedido}:`, respuesta);
  } catch (err) {
    respuesta = `error: ${(err as Error).message}`;
    console.error(`[meta] no se pudo mandar la compra del pedido ${pedidoId}:`, respuesta);
  }

  await db
    .from("pedido_meta_ads")
    .update({ compra_respuesta: respuesta, fbp: null, fbc: null, ip: null, user_agent: null })
    .eq("pedido_id", pedidoId);
}
