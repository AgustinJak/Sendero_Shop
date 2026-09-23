import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Archivos de public/ que cambian muy poco. Vercel los servía con max-age=0,
  // así que el navegador los volvía a pedir en cada visita. Un día de caché más
  // una semana de stale-while-revalidate: si se reemplaza uno con el mismo
  // nombre, a más tardar al día siguiente se ve el nuevo.
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return [
      { source: "/icons/:path*", headers: cache },
      { source: "/assets/:path*", headers: cache },
      { source: "/logo-sendero.svg", headers: cache },
    ];
  },
  // www.sendero3d.com servía el sitio entero, igual que sendero3d.com: dos
  // copias para Google (el canónico ya apunta al dominio sin www) y dos cachés
  // separadas en Vercel. Las páginas pasan a redirigir al dominio principal.
  //
  // /api/ queda afuera a propósito: si algún webhook (Mercado Pago, el cron)
  // estuviera configurado con www, un POST redirigido puede no reintentarse.
  //
  // Ojo: si algún día se configura en Vercel la redirección inversa
  // (sendero3d.com -> www), esto arma un bucle. Hay que elegir una sola.
  async redirects() {
    const desdeWww = [{ type: "host" as const, value: "www.sendero3d.com" }];
    return [
      { source: "/", has: desdeWww, destination: "https://sendero3d.com/", permanent: true },
      { source: "/:path((?!api/).+)", has: desdeWww, destination: "https://sendero3d.com/:path", permanent: true },
    ];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "zxvjyqezicalyjhvobow.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
