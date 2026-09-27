/**
 * Píxel de Meta (Facebook e Instagram) en el navegador. Ver
 * "SHOP - Integración Meta Ads" en el vault.
 *
 * Qué manda el navegador: PageView en cada página, ViewContent en la ficha,
 * AddToCart, InitiateCheckout, AddPaymentInfo cuando se crea el pedido y
 * Contact al tocar un link de WhatsApp. La compra (Purchase) NO sale de acá:
 * la manda el servidor por la API de conversiones cuando el pedido se paga
 * (lib/meta-capi.ts), porque en el navegador solo se sabe que se creó.
 *
 * Carga igual que GTM (app/layout.tsx): la cola `fbq` existe desde el primer
 * evento, pero el script de Meta (~100 KB) se baja con la primera interacción
 * o a los 8 segundos. Lo que se dispara antes queda en la cola y sale cuando
 * llega el script.
 *
 * Sin NEXT_PUBLIC_META_PIXEL_ID no hace nada. En /admin no se carga.
 */

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

let iniciado = false;
let ultimaRuta: string | null = null;

/**
 * Deja el píxel listo (cola, init y el primer PageView). Se llama desde el
 * primer evento que aparezca, sea el de la página o el de un componente: los
 * efectos de los hijos corren antes que el de MetaPixel, y un `track` que
 * llega antes del `init` Meta lo descarta.
 */
function asegurarPixel(): boolean {
  if (typeof window === "undefined" || !META_PIXEL_ID) return false;
  if (iniciado) return true;
  if (window.location.pathname.startsWith("/admin")) return false;
  iniciado = true;

  guardarClicDeAnuncio();
  crearCola();
  window.fbq!("init", META_PIXEL_ID);
  window.fbq!("track", "PageView");
  ultimaRuta = window.location.pathname;
  programarCarga();
  escucharWhatsapp();
  return true;
}

/** La cola del snippet oficial de Meta, sin el <script> (ese va en programarCarga). */
function crearCola() {
  if (window.fbq) return;
  const fbq = function (...args: unknown[]) {
    // Con `this` = fbq, como el snippet oficial.
    if (fbq.callMethod) fbq.callMethod.call(fbq, ...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  if (!window._fbq) window._fbq = fbq;
}

function programarCarga() {
  const eventos = ["pointerdown", "keydown", "touchstart", "scroll", "mousemove"] as const;
  const opciones = { passive: true } as const;
  let hecho = false;
  const cargar = () => {
    if (hecho) return;
    hecho = true;
    eventos.forEach((e) => window.removeEventListener(e, cargar));
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(s);
  };
  eventos.forEach((e) => window.addEventListener(e, cargar, opciones));
  setTimeout(cargar, 8000);
}

/**
 * Guarda el clic del anuncio (`fbclid`) en la cookie `_fbc`, con el formato de
 * Meta (fb.1.<ms>.<fbclid>). El script de Meta lo hace solo, pero lo lee de la
 * URL al cargar, y como carga tarde, a veces la persona ya navegó y el fbclid
 * se perdió. Con la cookie, el servidor además lo manda junto con la compra.
 */
function guardarClicDeAnuncio() {
  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  if (!fbclid || fbclid.length > 500) return;
  const actual = document.cookie.match(/(?:^|; )_fbc=([^;]*)/)?.[1];
  if (actual && actual.endsWith(`.${fbclid}`)) return;

  const dominio = window.location.hostname.endsWith("sendero3d.com") ? "; domain=.sendero3d.com" : "";
  const seguro = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `_fbc=fb.1.${Date.now()}.${fbclid}; max-age=${90 * 24 * 3600}; path=/; SameSite=Lax${dominio}${seguro}`;
}

/** Tocar un link de WhatsApp es la consulta más común de la tienda: cuenta como Contact. */
function escucharWhatsapp() {
  document.addEventListener(
    "click",
    (e) => {
      const link = (e.target as Element | null)?.closest?.('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
      if (link) window.fbq?.("track", "Contact");
    },
    { capture: true }
  );
}

/** PageView en cada cambio de página (la tienda navega sin recargar). */
export function paginaVistaMeta(ruta: string) {
  if (!asegurarPixel() || ruta === ultimaRuta) return;
  ultimaRuta = ruta;
  window.fbq!("track", "PageView");
}

/** Un evento estándar de Meta. No hace nada si el píxel no está configurado o en /admin. */
export function metaTrack(evento: string, datos: Record<string, unknown> = {}) {
  if (!asegurarPixel()) return;
  window.fbq!("track", evento, { currency: "ARS", ...datos });
}

/** content_ids y contents con el id de producto: el mismo `g:id` del feed /api/feed/google-merchant. */
export function contenidosMeta(items: { id: string; quantity: number; price?: number }[]) {
  return {
    content_type: "product",
    content_ids: items.map((i) => i.id),
    contents: items.map((i) => ({
      id: i.id,
      quantity: i.quantity,
      ...(i.price != null && { item_price: i.price }),
    })),
    num_items: items.reduce((n, i) => n + i.quantity, 0),
  };
}
