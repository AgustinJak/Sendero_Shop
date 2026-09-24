import type { User } from "@supabase/supabase-js";

/**
 * Si el usuario es admin del Shop.
 *
 * Antes alcanzaba con tener sesión, y con el registro público de Supabase
 * abierto eso era cualquiera (ver SHOP - Seguridad, punto 5). Ahora el permiso
 * sale de `app_metadata.role`, que solo el servidor puede escribir: un usuario
 * no puede cambiarse su propio app_metadata desde el navegador.
 *
 * La base aplica la misma regla con `public.es_admin()` en sus políticas, así
 * que aunque alguien saltee el panel, tampoco puede escribir directo.
 *
 * Para dar de alta un admin nuevo (desde el SQL editor de Supabase):
 *   update auth.users
 *   set raw_app_meta_data = raw_app_meta_data || '{"role":"admin"}'
 *   where email = '...';
 * y que esa persona cierre sesión y vuelva a entrar.
 */
export function esAdmin(user: User | null | undefined): user is User {
  return user?.app_metadata?.role === "admin";
}
