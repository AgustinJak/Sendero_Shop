import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { ETIQUETA_TIENDA } from "@/lib/queries";

/**
 * Marca como vieja toda la tienda pública para que se vuelva a generar.
 *
 * Las páginas de la tienda se cachean (ver `revalidate` en cada page.tsx): se
 * arman una vez y Vercel las sirve ya hechas, en vez de consultar Supabase en
 * cada visita. El costo es que un cambio del admin no se ve solo — por eso cada
 * ruta del admin que modifica algo visible en la tienda llama a esto.
 *
 * Invalida todo y no página por página a propósito: un producto aparece en su
 * página, en el catálogo, en la home, en colecciones y en relacionados, y
 * perseguir cada lugar es la forma segura de olvidarse de uno. Los cambios del
 * admin son pocos por día; regenerar de más no cuesta nada.
 *
 * Si alguna ruta se olvida de llamarla, igual las páginas se regeneran solas
 * cada pocos minutos (`revalidate`), así que el peor caso es una demora, no
 * un dato viejo para siempre.
 */
export function revalidarTienda() {
  // Las páginas cacheadas…
  revalidatePath("/", "layout");
  // …y las consultas cacheadas (catálogo). `expire: 0` las vence en el acto: con
  // el perfil "max" el primer visitante todavía vería el dato viejo, y para un
  // cambio de precio eso no sirve.
  revalidateTag(ETIQUETA_TIENDA, { expire: 0 });
}

/**
 * Envuelve un handler de una ruta del admin: si respondió bien, invalida la
 * tienda. Se usa como `export const PATCH = conRevalidacion(patch)`.
 *
 * Es un envoltorio y no una llamada suelta al final de cada handler porque
 * esos handlers tienen varios `return`, y agregarla a mano en cada uno es
 * exactamente el tipo de cosa que un día alguien se olvida.
 */
export function conRevalidacion<A extends unknown[], R extends Response>(
  handler: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    const res = await handler(...args);
    if (res.ok) revalidarTienda();
    return res;
  };
}
