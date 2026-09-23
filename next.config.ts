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
