import type { DireccionEnvio } from "@/types";

/**
 * Courier local (SyB Logística): entrega en el día en CABA y los cordones del
 * GBA, con precio plano por zona.
 *
 * El problema real de esta integración es decidir si una dirección entra en
 * cobertura. La localidad que escribe el cliente no alcanza: "Ramos Mejía",
 * "San Justo" y "Villa Luzuriaga" son todas La Matanza, y el mapa del courier
 * razona por partido. Por eso el checkout guarda además el `municipio` que
 * devuelve la API de georef al elegir la localidad del autocompletado, y el
 * matcheo se hace contra eso.
 *
 * Si no hay municipio (el cliente escribió la dirección a mano y no eligió del
 * autocompletado) NO se ofrece el courier. Es preferible perder una venta con
 * envío barato antes que cobrar el precio de otra zona o prometer una entrega
 * en un lugar sin cobertura.
 */

export interface ZonaSyb {
  id: string;
  nombre: string;
  precio: number;
  zonas: string[];
  orden: number;
  activo: boolean;
  /** Rangos y CPs sueltos: "1000-1499, 1602". Ver buscarZonaSybPorCP. */
  codigos_postales?: string | null;
}

/**
 * Normaliza para comparar: sin acentos, sin mayúsculas, sin puntos ni espacios
 * de más. "José C. Paz" y "jose c paz" tienen que dar lo mismo.
 */
function normalizar(texto: string): string {
  return (texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Busca la zona que cubre una dirección.
 *
 * Se prueba primero el municipio (el dato confiable, viene de georef) y recién
 * después la localidad, porque el mapa del courier mezcla partidos con
 * localidades sueltas: "Guernica" es una localidad del partido Presidente
 * Perón y figura con nombre propio.
 *
 * Devuelve `null` cuando no hay cobertura o no hay dato suficiente.
 */
export function buscarZonaSyb(
  direccion: Pick<DireccionEnvio, "localidad" | "provincia"> & { municipio?: string | null },
  zonas: ZonaSyb[]
): ZonaSyb | null {
  const municipio = normalizar(direccion.municipio || "");
  const localidad = normalizar(direccion.localidad || "");
  const provincia = normalizar(direccion.provincia || "");

  if (!municipio && !localidad) return null;

  const activas = zonas
    .filter((z) => z.activo !== false)
    .sort((a, b) => a.orden - b.orden);

  // CABA sin municipio igual se resuelve: la provincia ya es identificatoria y
  // no hay ambigüedad posible dentro de la ciudad.
  const esCaba =
    provincia === "caba" ||
    provincia === "capital federal" ||
    provincia === "ciudad autonoma de buenos aires";

  for (const zona of activas) {
    const nombres = zona.zonas.map(normalizar);
    if (municipio && nombres.includes(municipio)) return zona;
    if (esCaba && nombres.includes(provincia)) return zona;
  }

  // Segunda vuelta por localidad, solo si no hubo match por municipio.
  for (const zona of activas) {
    const nombres = zona.zonas.map(normalizar);
    if (localidad && nombres.includes(localidad)) return zona;
  }

  return null;
}

/**
 * Busca la zona a partir del código postal solo.
 *
 * Es el camino del calculador de la ficha de producto, donde el visitante
 * todavía no cargó una dirección: solo escribe un CP. Es menos preciso que el
 * matcheo por municipio del checkout — un partido puede compartir CP con otro
 * y georef no indexa por CP, así que la lista la carga el dueño a mano.
 *
 * Una zona sin CPs cargados simplemente no se ofrece acá. El precio que manda
 * sigue siendo el que recalcula el servidor al crear el pedido.
 */
export function buscarZonaSybPorCP(cp: string, zonas: ZonaSyb[]): ZonaSyb | null {
  const numero = parseInt(String(cp).replace(/\D/g, ""), 10);
  if (!Number.isFinite(numero)) return null;

  const activas = zonas
    .filter((z) => z.activo !== false && z.codigos_postales)
    .sort((a, b) => a.orden - b.orden);

  for (const zona of activas) {
    for (const parte of (zona.codigos_postales || "").split(",")) {
      const tramo = parte.trim();
      if (!tramo) continue;

      const rango = tramo.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rango) {
        const desde = parseInt(rango[1], 10);
        const hasta = parseInt(rango[2], 10);
        if (numero >= desde && numero <= hasta) return zona;
        continue;
      }

      if (parseInt(tramo.replace(/\D/g, ""), 10) === numero) return zona;
    }
  }

  return null;
}

/**
 * Cómo se le muestra al cliente. El nombre del courier no aparece: lo que le
 * importa es el medio y el plazo.
 *
 * El nombre de la zona tampoco se muestra — "Primer cordón" es jerga nuestra
 * y no le dice nada a quien compra. El precio ya comunica lo que hace falta.
 */
export const SYB_LABEL = "Moto mensajería";

/** Franja horaria del courier. Es el dato que decide si el cliente va a estar. */
export const SYB_HORARIO = "de 13 a 21 h";

/** Versión corta, para la lista de opciones del checkout. */
export const SYB_PLAZO = `Entrega en el día, ${SYB_HORARIO}`;

/**
 * Versión completa para después de la compra (email y página del pedido),
 * donde el cliente necesita saber cuándo tiene que estar en el domicilio.
 */
export const SYB_HORARIO_DETALLE = `La entrega es el mismo día, en una franja ${SYB_HORARIO}. Aseguráte de que haya alguien para recibirlo.`;
