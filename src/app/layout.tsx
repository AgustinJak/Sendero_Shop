import type { Metadata } from "next";
import { Inter, Cinzel } from "next/font/google";
import "./globals.css";

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
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${cinzel.variable}`}>
      <body className="min-h-screen flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
