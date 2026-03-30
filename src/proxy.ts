import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

  const path = request.nextUrl.pathname;
  const isAdminPage = path.startsWith("/admin");
  const isLoginPage = path === "/admin/login";
  const isAdminApi = path.startsWith("/api/admin");

  // Protect admin pages
  if (isAdminPage && !isLoginPage && !user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Redirect logged-in users away from login
  if (isLoginPage && user) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Protect admin API routes
  if (isAdminApi && !user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
