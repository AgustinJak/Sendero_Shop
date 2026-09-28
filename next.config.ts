import type { NextConfig } from "next";

// Política de contenido (SHOP - Seguridad, punto 8). Dice de qué dominios puede
// cargar cosas la página: si alguien lograra meter HTML en el sitio, el
// navegador no cargaría scripts de otro lado ni mandaría datos afuera.
//
// Por ahora va en modo reporte: no bloquea nada, solo avisa a /api/csp-report
// (queda en el log de Vercel). Cuando pase un tiempo sin avisos de cosas
// legítimas, se cambia el nombre del header para que bloquee.
//
// Solo `report-uri`, sin `report-to`: con los dos, Chrome usa `report-to` e
// ignora `report-uri`, y esos avisos nunca llegaron al log (probado en
// producción el 2026-09-28). Con `report-uri` el navegador avisa en el acto.
//
// 'unsafe-inline' en scripts es obligatorio con el caché actual: Next mete
// scripts en línea en cada página y la alternativa (nonces) obliga a armar
// cada página en cada visita.
//
// De dónde sale cada dominio: Supabase (imágenes, videos y el panel), Turnstile
// (captcha del checkout), GA4 por GTM (el contenedor solo tiene esa etiqueta),
// YouTube (videos en las fichas), la API de localidades del checkout y el
// píxel de Meta (lib/meta-pixel.ts). El script sale de connect.facebook.net y
// manda los eventos a www.facebook.com por un formulario dentro de un iframe
// (por eso va también en frame-src y form-action). El gateway de Datahash
// (capig.datah04.com) queda afuera a propósito: es pago y no se usa; la compra
// la manda nuestro servidor (lib/meta-capi.ts).
const SUPABASE = "https://zxvjyqezicalyjhvobow.supabase.co";
const GOOGLE =
  "https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.g.doubleclick.net https://*.google.com https://*.google.com.ar";
const META = "https://connect.facebook.net https://www.facebook.com";
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://challenges.cloudflare.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE} https://img.youtube.com ${GOOGLE} https://www.facebook.com`,
  "font-src 'self' data:",
  `media-src 'self' blob: ${SUPABASE}`,
  `connect-src 'self' ${SUPABASE} wss://zxvjyqezicalyjhvobow.supabase.co https://apis.datos.gob.ar https://challenges.cloudflare.com ${GOOGLE} ${META}`,
  "frame-src https://challenges.cloudflare.com https://www.youtube-nocookie.com https://www.youtube.com https://www.googletagmanager.com https://www.facebook.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://www.facebook.com",
  "frame-ancestors 'self'",
  "report-uri /api/csp-report",
].join("; ");

const seguridad = [
  // Nadie puede meter el sitio en un iframe de otro dominio (clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // El navegador no adivina tipos: un archivo subido no se ejecuta como script.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // A otros sitios solo les llega el dominio de donde viene la visita, no la
  // URL entera (que en /pedido/[id] incluye el id del pedido).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nada del sitio usa cámara, micrófono ni ubicación.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Content-Security-Policy-Report-Only", value: CSP },
];

const nextConfig: NextConfig = {
  async headers() {
    // Archivos de public/ que cambian muy poco. Vercel los servía con max-age=0,
    // así que el navegador los volvía a pedir en cada visita. Un día de caché más
    // una semana de stale-while-revalidate: si se reemplaza uno con el mismo
    // nombre, a más tardar al día siguiente se ve el nuevo.
    const cache = [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }];
    return [
      { source: "/:path*", headers: seguridad },
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
