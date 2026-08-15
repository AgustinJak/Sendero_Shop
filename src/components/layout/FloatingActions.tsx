"use client";

import { usePathname } from "next/navigation";
import WhatsAppButton from "./WhatsAppButton";
import MercadoLibreButton from "./MercadoLibreButton";
import ScrollToTop from "./ScrollToTop";

/**
 * Rutas donde las burbujas flotantes no se muestran.
 *
 * En el checkout se apilan tres botones fijos en la esquina inferior derecha
 * (WhatsApp, Mercado Libre, volver arriba) justo encima del Turnstile y del
 * botón de confirmar, que en mobile viven ahí abajo. Un cliente lo reportó con
 * captura: el botón de WhatsApp tapaba el total del CTA.
 *
 * Además de estorbar, el de Mercado Libre invita a irse a otro marketplace en
 * el momento exacto en que el carrito está por cerrarse.
 */
const RUTAS_SIN_BURBUJAS = ["/checkout"];

export default function FloatingActions({ whatsapp }: { whatsapp: string }) {
  const pathname = usePathname();

  if (RUTAS_SIN_BURBUJAS.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return null;
  }

  return (
    <>
      <MercadoLibreButton />
      <WhatsAppButton phone={whatsapp} />
      <ScrollToTop />
    </>
  );
}
