import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente para leer datos PÚBLICOS de la tienda (catálogo, banners, config).
 *
 * No lee cookies, a propósito. En Next, leer cookies vuelve dinámica la página
 * entera: antes todo el catálogo usaba createServerSupabaseClient y por eso
 * ninguna página se podía cachear — cada visita armaba la página de cero y
 * consultaba Supabase. Los datos del catálogo no dependen de quién mira, así que
 * no necesitan la sesión.
 *
 * Usa la anon key: ve exactamente lo que ve un visitante (las políticas RLS
 * esconden lo inactivo). Para leer como admin, usar createServerSupabaseClient.
 */
export function createPublicSupabaseClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll can fail in Server Components — that's expected
          }
        },
      },
    }
  );
}

export async function createServiceRoleClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
