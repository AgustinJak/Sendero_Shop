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
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sendero Shop",
  },
  metadataBase: new URL("https://sendero3d.com"),
  title: {
    default: "Sendero Shop — Figuras y Accesorios Impresos en 3D",
    template: "%s | Sendero Shop",
  },
  description:
    "Figuras, katanas y accesorios impresos en 3D inspirados en anime, cine y videojuegos. Producción a pedido en Argentina.",
  keywords: [
    "impresión 3D",
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
    title: "Sendero Shop — Figuras y Accesorios Impresos en 3D",
    description:
      "Figuras, katanas y accesorios impresos en 3D inspirados en anime, cine y videojuegos. Producción a pedido en Argentina.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sendero Shop — Figuras y Accesorios Impresos en 3D",
    description:
      "Figuras, katanas y accesorios impresos en 3D inspirados en anime. Envío a todo Argentina.",
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
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
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
