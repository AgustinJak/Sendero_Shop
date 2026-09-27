import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Adónde volver después del login. Solo a una página de este mismo sitio:
 * antes `next` aceptaba cualquier URL y /api/auth/callback?next=https://otro
 * mandaba afuera, con nuestro dominio como carnada (SHOP - Seguridad, punto 9).
 *
 * Se resuelve la URL entera y se compara el origen, en vez de mirar si empieza
 * con "/": "//otro", "/\otro" o una barra con un tab en el medio también
 * terminan en otro dominio para el navegador.
 */
function destinoSeguro(next: string | null, base: string): URL {
  const porDefecto = new URL("/admin", base);
  if (!next) return porDefecto;
  try {
    const destino = new URL(next, base);
    return destino.origin === porDefecto.origin ? destino : porDefecto;
  } catch {
    return porDefecto;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const destino = destinoSeguro(searchParams.get("next"), request.url);

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(destino);
}
