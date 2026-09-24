import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { optimizarEnStorage, rutaDesdeUrlPublica } from "@/lib/imagenes";
import { conRevalidacion } from "@/lib/revalidar";
import { esAdmin } from "@/lib/admin";

// Bajar, recomprimir y subir una foto de 6 MB puede llevar varios segundos;
// el default de Vercel es corto. 60 es el máximo del plan Hobby.
export const maxDuration = 60;

/**
 * Registra una imagen que el panel ya subió al bucket por URL firmada, y la
 * optimiza en el mismo paso.
 *
 * La subida es directa del navegador a Supabase (para esquivar el límite de
 * 4,5 MB por request de Vercel), así que el archivo llega crudo: un PNG de 6 MB
 * queda tal cual. Acá el servidor lo baja, genera la versión WebP y la
 * miniatura, borra el crudo y guarda las URLs optimizadas. No hay botón que
 * apretar: pasa en cada subida. Ver lib/imagenes.ts.
 */
async function post(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!esAdmin(user)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { productoId, url, orden, tipo } = await req.json();

  if (!productoId || !url || tipo === undefined) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  let urlFinal: string = url;
  let urlThumb: string | null = null;

  const ruta = tipo === "imagen" ? rutaDesdeUrlPublica(url) : null;
  if (ruta) {
    try {
      const r = await optimizarEnStorage(serviceClient, ruta, { borrarOriginal: true });
      urlFinal = r.url;
      urlThumb = r.urlThumb;
    } catch (err) {
      // Si sharp no puede con el archivo, la foto se guarda igual, sin
      // optimizar: es preferible a que el admin no pueda cargarla.
      console.error("[imagenes/register] no se pudo optimizar:", (err as Error).message);
    }
  }

  const { data, error } = await serviceClient
    .from("producto_imagenes")
    .insert({
      producto_id: productoId,
      url: urlFinal,
      url_thumb: urlThumb,
      orden: orden ?? 0,
      alt_text: null,
      tipo,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// Si responden bien, invalidan la caché de la tienda: ver lib/revalidar.ts.
export const POST = conRevalidacion(post);
