import { clasificarOrigen, type Origen } from "@/lib/origen";

/**
 * Analítica propia en el navegador (SHOP - Analítica propia). Manda cada
 * evento a /api/pulso, que lo anota en Supabase para el dashboard del admin.
 *
 * - Sin cookies ni datos personales: al visitante lo cuenta el servidor con
 *   un código que cambia todos los días.
 * - Con sendBeacon: no frena la página y llega aunque la persona se vaya.
 * - El endpoint se llama "pulso" y no "analytics" o "track" a propósito: los
 *   bloqueadores cortan esas rutas.
 * - En /admin no se manda nada.
 *
 * Del origen se guardan dos cosas en el navegador, ninguna personal:
 * - sessionStorage: de dónde llegó esta visita (lo llevan todos sus eventos).
 * - localStorage: el último origen que no fue "directo", por 30 días. Es el
 *   que queda en el pedido: si alguien llega por un anuncio y compra dos días
 *   después entrando directo, la venta es del anuncio.
 */

export type TipoPulso = "vista" | "producto" | "carrito" | "checkout" | "busqueda" | "whatsapp";

interface Evento {
  tipo: TipoPulso;
  producto_id?: string;
  cantidad?: number;
  termino?: string;
  resultados?: number;
}

type OrigenGuardado = { origen: Origen; campania: string | null };

const CLAVE_VISITA = "sd_origen";
const CLAVE_ULTIMO = "sd_origen_ultimo";
const TREINTA_DIAS = 30 * 24 * 3600 * 1000;

let origenVisita: OrigenGuardado | null = null;

function leer<T>(almacen: Storage, clave: string): T | null {
  try {
    const v = almacen.getItem(clave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}

function guardar(almacen: Storage, clave: string, valor: unknown) {
  try {
    almacen.setItem(clave, JSON.stringify(valor));
  } catch {
    // Navegación privada o almacenamiento bloqueado: se sigue sin guardar.
  }
}

/** Origen de esta visita. Se calcula una vez por carga de página. */
function origenDeLaVisita(): OrigenGuardado {
  if (origenVisita) return origenVisita;
  const nuevo = clasificarOrigen(new URL(window.location.href), document.referrer, window.location.hostname);
  const anterior = leer<OrigenGuardado>(sessionStorage, CLAVE_VISITA);
  origenVisita = nuevo ?? anterior ?? { origen: "directo", campania: null };
  guardar(sessionStorage, CLAVE_VISITA, origenVisita);
  if (origenVisita.origen !== "directo") {
    guardar(localStorage, CLAVE_ULTIMO, { ...origenVisita, en: Date.now() });
  }
  return origenVisita;
}

/** Origen que se guarda en el pedido: el de la visita, o el último no directo de los últimos 30 días. */
export function origenParaPedido(): { origen: Origen; campania: string | null } {
  if (typeof window === "undefined") return { origen: "directo", campania: null };
  const visita = origenDeLaVisita();
  if (visita.origen !== "directo") return visita;
  const ultimo = leer<OrigenGuardado & { en: number }>(localStorage, CLAVE_ULTIMO);
  if (ultimo && Date.now() - ultimo.en < TREINTA_DIAS) {
    return { origen: ultimo.origen, campania: ultimo.campania };
  }
  return visita;
}

export function pulso(evento: Evento) {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/admin")) return;

  const { origen, campania } = origenDeLaVisita();
  const cuerpo = JSON.stringify({ ...evento, ruta: window.location.pathname, origen, campania });
  try {
    if (navigator.sendBeacon?.("/api/pulso", new Blob([cuerpo], { type: "application/json" }))) return;
  } catch {
    // Sigue con fetch.
  }
  fetch("/api/pulso", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: cuerpo,
    keepalive: true,
  }).catch(() => {});
}

let iniciado = false;

/** Una vez por carga: calcula el origen y escucha los clics en links de WhatsApp. */
export function iniciarPulso() {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;
  origenDeLaVisita();
  document.addEventListener(
    "click",
    (e) => {
      const link = (e.target as Element | null)?.closest?.('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
      if (link) pulso({ tipo: "whatsapp" });
    },
    { capture: true }
  );
}
