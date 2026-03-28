import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Cinzel } from "next/font/google";
import "./globals.css";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

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

export const metadata: Metadata = {
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
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script
            id="ga4-config"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`,
            }}
          />
        </>
      )}
      <body className="min-h-screen flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
