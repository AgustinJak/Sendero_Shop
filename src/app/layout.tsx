import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter, Cinzel } from "next/font/google";
import ServiceWorkerRegister from "@/components/layout/ServiceWorkerRegister";
// import PushNotificationPrompt from "@/components/layout/PushNotificationPrompt";
import "./globals.css";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
});

export const viewport: Viewport = {
  themeColor: "#6b21a8",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      // El SVG va primero: el navegador que lo entiende se queda con ese y
      // lo dibuja nítido en cualquier densidad. Los PNG quedan de fallback
      // para los que no, así que no se borran.
      { url: "/logo-sendero.svg", type: "image/svg+xml" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    // Apple no acepta SVG en el touch icon ni en los íconos del manifest:
    // esos siguen siendo PNG por obligación, no por olvido.
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sendero Shop",
  },
  metadataBase: new URL("https://sendero3d.com"),
  title: {
    default: "Sendero Shop — Figuras y Accesorios de Colección",
    template: "%s | Sendero Shop",
  },
  description:
    "Figuras, katanas y accesorios de colección inspirados en anime, cine y videojuegos. Fabricación propia a pedido en Argentina.",
  keywords: [
    "figuras anime",
    "katanas",
    "accesorios 3D",
    "Argentina",
    "print on demand",
    "one piece",
    "demon slayer",
    "bleach",
    "figuras 3D",
    "katanas anime",
    "sendero shop",
  ],
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "https://sendero3d.com",
    siteName: "Sendero Shop",
    title: "Sendero Shop — Figuras y Accesorios de Colección",
    description:
      "Figuras, katanas y accesorios de colección inspirados en anime, cine y videojuegos. Fabricación propia a pedido en Argentina.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sendero Shop — Figuras y Accesorios de Colección",
    description:
      "Figuras, katanas y accesorios de colección inspirados en anime. Envío a todo Argentina.",
  },
  alternates: {
    canonical: "https://sendero3d.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${cinzel.variable}`}>
      {GTM_ID && (
        // GTM se carga con la primera interacción (toque, scroll, tecla, mouse),
        // o a los 8 segundos si no hay ninguna. GTM + GA4 pesan ~310 KB y eran
        // lo que más bloqueaba el hilo principal en celulares (PageSpeed,
        // 2026-09-23: 343 ms de CPU). Una persona interactúa enseguida, así que
        // las visitas reales se siguen midiendo; lo que se pierde es la visita
        // que se va antes de 8 segundos sin tocar nada.
        //
        // dataLayer se inicializa de entrada: los eventos que se empujan antes
        // (begin_checkout, purchase) quedan encolados y GTM los lee al cargar.
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var hecho=false,ev=['pointerdown','keydown','touchstart','scroll','mousemove'],op={passive:true};
function cargar(){if(hecho)return;hecho=true;ev.forEach(function(e){w.removeEventListener(e,cargar,op)});
var j=d.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;d.head.appendChild(j);}
ev.forEach(function(e){w.addEventListener(e,cargar,op)});setTimeout(cargar,8000);
})(window,document,'dataLayer','${GTM_ID}');`,
          }}
        />
      )}
      <body className="min-h-screen flex flex-col antialiased">
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        {children}
        <ServiceWorkerRegister />
        {/* <PushNotificationPrompt /> */}
      </body>
    </html>
  );
}
