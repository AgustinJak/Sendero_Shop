import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { esAdmin } from "@/lib/admin";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  // Tener sesión no alcanza: tiene que ser admin (ver lib/admin.ts).
  const admin = esAdmin(user);

  const path = request.nextUrl.pathname;
  const isAdminPage = path.startsWith("/admin");
  const isLoginPage = path === "/admin/login";
  const isAdminApi = path.startsWith("/api/admin");

  // Panel: sin sesión o sin permiso, al login. Si tiene sesión pero no es
  // admin, el login le muestra que su cuenta no tiene acceso.
  if (isAdminPage && !isLoginPage && !admin) {
    const destino = new URL("/admin/login", request.url);
    if (user) destino.searchParams.set("sin_permiso", "1");
    return NextResponse.redirect(destino);
  }

  // Un admin que ya tiene sesión no necesita ver el login.
  if (isLoginPage && admin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // API del admin: 401 sin sesión, 403 con sesión pero sin permiso.
  if (isAdminApi && !admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: user ? 403 : 401 });
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
