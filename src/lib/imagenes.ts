import "server-only";
import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Optimización de imágenes del catálogo, en un solo lugar.
 *
 * Por qué existe: `next.config.ts` tiene `images.unoptimized` desde el
 * 2026-04-06, porque la optimización de Vercel cobraba por imagen (402). Desde
 * entonces `next/image` entrega el archivo tal cual lo subieron — había fotos
 * PNG de 6 MB mostrándose en tarjetas de 300 px. En vez de pagar el optimizador
 * de Vercel, las versiones se generan UNA vez, al subir, y quedan en el bucket.
 *
 * Cada foto tiene dos versiones:
 * - principal: WebP de hasta 1600 px de ancho, para la página del producto.
 * - miniatura: WebP con el lado CORTO en 480 px, para las tarjetas. Lado corto
 *   y no ancho porque la tarjeta es cuadrada con `object-cover`: con el ancho
 *   fijo, una foto apaisada quedaría más baja que la tarjeta y se estiraría.
 *
 * Se usa en `/api/admin/imagenes/register` (la subida real del panel), en el
 * POST de `/api/admin/imagenes` y en el reproceso de las imágenes viejas.
 */

export const BUCKET_PRODUCTOS = "productos";

export const PRINCIPAL_MAX_ANCHO = 1600;
export const PRINCIPAL_CALIDAD = 80;
export const MINIATURA_LADO = 480;
export const MINIATURA_CALIDAD = 75;

/**
 * Un año. Los nombres llevan timestamp y nunca se reescriben con otro
 * contenido, así que el navegador puede guardarlas sin volver a preguntar. La
 * subida firmada del panel no lo seteaba y las fotos salían con `no-cache`.
 */
export const CACHE_UN_ANIO = "31536000";

export async function generarVersiones(original: Buffer): Promise<{ principal: Buffer; miniatura: Buffer }> {
  const base = sharp(original, { failOn: "none" }).rotate();
  const meta = await base.metadata();

  const [recomprimida, miniatura] = await Promise.all([
    base
      .clone()
      .resize({ width: PRINCIPAL_MAX_ANCHO, withoutEnlargement: true })
      .webp({ quality: PRINCIPAL_CALIDAD, effort: 5 })
      .toBuffer(),
    base
      .clone()
      .resize({ width: MINIATURA_LADO, height: MINIATURA_LADO, fit: "outside", withoutEnlargement: true })
      .webp({ quality: MINIATURA_CALIDAD, effort: 5 })
      .toBuffer(),
  ]);

  // Un WebP que ya entra en el ancho y pesa menos que la recompresión se deja
  // como está: recomprimirlo solo le sacaría calidad.
  const yaServia =
    meta.format === "webp" &&
    (meta.width ?? Infinity) <= PRINCIPAL_MAX_ANCHO &&
    original.length <= recomprimida.length;

  return { principal: yaServia ? original : recomprimida, miniatura };
}

/**
 * Rutas de las dos versiones. Nunca coinciden con la del original: si el
 * original ya era `x.webp`, la principal pasa a `x-opt.webp`. Así reprocesar
 * no pisa un archivo que otra fila o una caché todavía podrían estar usando.
 */
export function rutasVersiones(ruta: string): { principal: string; miniatura: string } {
  const base = ruta.replace(/\.[^./]+$/, "");
  const principal = `${base}.webp` === ruta ? `${base}-opt.webp` : `${base}.webp`;
  return { principal, miniatura: `${base}-thumb.webp` };
}

/**
 * Ruta dentro del bucket a partir de la URL pública. Null si la URL no es de
 * este proyecto de Supabase — `register` recibe la URL del navegador y no se
 * puede ir a procesar cualquier cosa.
 */
export function rutaDesdeUrlPublica(url: string, bucket = BUCKET_PRODUCTOS): string | null {
  const proyecto = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const prefijo = `${proyecto}/storage/v1/object/public/${bucket}/`;
  if (!proyecto || !url.startsWith(prefijo)) return null;
  return decodeURIComponent(url.slice(prefijo.length).split("?")[0]);
}

/**
 * Baja un original del bucket, genera las dos versiones y las sube.
 *
 * `borrarOriginal`: lo usa `register`, donde el original es el archivo crudo
 * que el navegador subió hace un segundo y ninguna fila apunta a él. El
 * reproceso de imágenes viejas NO borra: los originales quedan como respaldo.
 */
export async function optimizarEnStorage(
  client: SupabaseClient,
  ruta: string,
  { borrarOriginal = false }: { borrarOriginal?: boolean } = {}
): Promise<{ url: string; urlThumb: string; bytesAntes: number; bytesDespues: number }> {
  const storage = client.storage.from(BUCKET_PRODUCTOS);

  const { data, error } = await storage.download(ruta);
  if (error || !data) throw new Error(`descarga de ${ruta}: ${error?.message ?? "sin datos"}`);
  const original = Buffer.from(await data.arrayBuffer());

  const { principal, miniatura } = await generarVersiones(original);
  const rutas = rutasVersiones(ruta);

  for (const [destino, cuerpo] of [
    [rutas.principal, principal],
    [rutas.miniatura, miniatura],
  ] as const) {
    const { error: e } = await storage.upload(destino, cuerpo, {
      contentType: "image/webp",
      cacheControl: CACHE_UN_ANIO,
      upsert: true,
    });
    if (e) throw new Error(`subida de ${destino}: ${e.message}`);
  }

  if (borrarOriginal && rutas.principal !== ruta) {
    // Si falla no pasa nada grave: queda un archivo huérfano, no una foto rota.
    await storage.remove([ruta]);
  }

  return {
    url: storage.getPublicUrl(rutas.principal).data.publicUrl,
    urlThumb: storage.getPublicUrl(rutas.miniatura).data.publicUrl,
    bytesAntes: original.length,
    bytesDespues: principal.length,
  };
}

export type ResultadoReproceso = {
  ruta: string;
  bytesAntes: number;
  bytesDespues: number;
  accion: "optimizada" | "externa" | "error" | "simulada";
  error?: string;
};

/**
 * Procesa las fotos de producto que todavía no tienen miniatura: las viejas,
 * las que se hayan colado por otro camino, o alguna cuya optimización falló
 * al subirla. Deja los originales en el bucket como respaldo.
 *
 * Corta antes de `tiempoMaxMs` para no pasarse del límite de la función en
 * Vercel: lo que quede pendiente se toma en la próxima corrida. Lo usan el
 * cron diario y el botón "Optimizar" del admin.
 */
export async function reprocesarPendientes(
  client: SupabaseClient,
  { limite = 40, tiempoMaxMs = 50_000, simular = false }: { limite?: number; tiempoMaxMs?: number; simular?: boolean } = {}
): Promise<{ pendientes: number; resultados: ResultadoReproceso[] }> {
  const inicio = Date.now();
  // Solo fotos del propio bucket: un link externo nunca va a tener miniatura y,
  // sin este filtro, ocuparía el cupo de cada corrida para siempre.
  const delBucket = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET_PRODUCTOS}/%`;

  const { count } = await client
    .from("producto_imagenes")
    .select("id", { count: "exact", head: true })
    .eq("tipo", "imagen")
    .is("url_thumb", null)
    .like("url", delBucket);

  const { data: filas, error } = await client
    .from("producto_imagenes")
    .select("id, url")
    .eq("tipo", "imagen")
    .is("url_thumb", null)
    .like("url", delBucket)
    .limit(limite);
  if (error) throw new Error(error.message);

  const resultados: ResultadoReproceso[] = [];
  for (const fila of filas ?? []) {
    if (Date.now() - inicio > tiempoMaxMs) break;

    const ruta = rutaDesdeUrlPublica(fila.url);
    if (!ruta) {
      // Link externo pegado a mano: no hay original en el bucket para procesar.
      resultados.push({ ruta: fila.url, bytesAntes: 0, bytesDespues: 0, accion: "externa" });
      continue;
    }
    if (simular) {
      resultados.push({ ruta, bytesAntes: 0, bytesDespues: 0, accion: "simulada" });
      continue;
    }

    try {
      const r = await optimizarEnStorage(client, ruta);
      const { error: e } = await client
        .from("producto_imagenes")
        .update({ url: r.url, url_thumb: r.urlThumb })
        .eq("id", fila.id);
      if (e) throw new Error(`base: ${e.message}`);
      resultados.push({ ruta, bytesAntes: r.bytesAntes, bytesDespues: r.bytesDespues, accion: "optimizada" });
    } catch (err) {
      resultados.push({ ruta, bytesAntes: 0, bytesDespues: 0, accion: "error", error: (err as Error).message });
    }
  }

  return { pendientes: count ?? 0, resultados };
}

export const BANNER_MAX_ANCHO = 1920;
const IMPORTAR_MAX_BYTES = 15 * 1024 * 1024;

/**
 * Trae al bucket una imagen pegada como link externo (imgur, Pinterest…),
 * optimizada. Devuelve la URL nueva, o null si la URL ya es del bucket.
 *
 * Por qué: los banners se cargan pegando una URL, y el de la home era un
 * original de Pinterest. Eso es una conexión más a un dominio ajeno justo en
 * el elemento que mide el LCP, sin control del peso, y si Pinterest lo borra o
 * bloquea el hotlink la home se queda sin banner.
 *
 * Tira error si no la puede traer: el que llama decide si guardar igual el
 * link original (los banners lo hacen, para no bloquear el formulario).
 */
export async function importarImagenExterna(
  client: SupabaseClient,
  url: string,
  { carpeta, maxAncho = BANNER_MAX_ANCHO }: { carpeta: string; maxAncho?: number }
): Promise<string | null> {
  if (rutaDesdeUrlPublica(url)) return null; // ya está en el bucket
  if (!/^https:\/\//i.test(url)) throw new Error("solo se importan URLs https");

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000), redirect: "follow" });
  if (!res.ok) throw new Error(`la URL respondió ${res.status}`);
  if (!(res.headers.get("content-type") ?? "").startsWith("image/")) throw new Error("la URL no es una imagen");
  const largo = Number(res.headers.get("content-length") ?? 0);
  if (largo > IMPORTAR_MAX_BYTES) throw new Error("la imagen pesa más de 15 MB");
  const original = Buffer.from(await res.arrayBuffer());
  if (original.length > IMPORTAR_MAX_BYTES) throw new Error("la imagen pesa más de 15 MB");

  const webp = await sharp(original, { failOn: "none" })
    .rotate()
    .resize({ width: maxAncho, withoutEnlargement: true })
    .webp({ quality: PRINCIPAL_CALIDAD, effort: 5 })
    .toBuffer();

  const ruta = `${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const storage = client.storage.from(BUCKET_PRODUCTOS);
  const { error } = await storage.upload(ruta, webp, { contentType: "image/webp", cacheControl: CACHE_UN_ANIO });
  if (error) throw new Error(`subida: ${error.message}`);
  return storage.getPublicUrl(ruta).data.publicUrl;
}
