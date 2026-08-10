/**
 * Cálculo de precios mayoristas (puro, usable en client y server).
 *
 * Modelo: cada item tiene su PVP; el descuento se aplica por cantidad según
 * los tramos de la lista. En un kit, cada producto usa el tramo de SU
 * cantidad, y al subtotal se le aplica un descuento extra por ser kit.
 */

import type {
  MayoristaKit,
  MayoristaTramo,
  MayoristaItem,
  MayoristaImagen,
  CartItem,
} from "@/types";

/** Tramos por defecto si no hay nada configurado. */
export const TRAMOS_DEFAULT: MayoristaTramo[] = [
  { min: 5, pct: 10 },
  { min: 10, pct: 20 },
  { min: 20, pct: 30 },
];

/**
 * Parsea los tramos desde el string de configuración: "5:10, 10:20, 20:30"
 * (cantidad mínima : % de descuento).
 *
 * Vacío o ausente = los tramos por defecto. Para desactivar los descuentos hay
 * que poner "0" explícitamente: el form de admin guarda todas las claves de una
 * sola vez, así que un campo que nunca se completó no puede significar "apagar".
 */
export function parseTramos(raw: string | null | undefined): MayoristaTramo[] {
  if (raw == null) return TRAMOS_DEFAULT;
  const texto = raw.trim();
  if (texto === "") return TRAMOS_DEFAULT;
  if (texto === "0") return []; // desactivado explícito
  const tramos = texto
    .split(",")
    .map((par) => {
      const [min, pct] = par.split(":").map((n) => Number(n.trim()));
      return { min, pct };
    })
    .filter((t) => Number.isFinite(t.min) && Number.isFinite(t.pct) && t.min > 0 && t.pct > 0)
    .sort((a, b) => a.min - b.min);
  return tramos.length > 0 ? tramos : TRAMOS_DEFAULT;
}

/** Tramo que corresponde a una cantidad (el de mayor `min` que la cantidad alcance). */
export function tramoParaCantidad(
  tramos: MayoristaTramo[],
  cantidad: number
): MayoristaTramo | null {
  let mejor: MayoristaTramo | null = null;
  for (const t of tramos) {
    if (t.min <= 0 || t.pct <= 0) continue;
    if (cantidad >= t.min && (mejor === null || t.min > mejor.min)) {
      mejor = t;
    }
  }
  return mejor;
}

/** Precio unitario aplicando el tramo por cantidad (o el PVP si no alcanza tramo). */
export function precioUnitario(
  pvp: number,
  tramos: MayoristaTramo[],
  cantidad: number
): { precio: number; pct: number } {
  const tramo = tramoParaCantidad(tramos, cantidad);
  const pct = tramo?.pct ?? 0;
  return { precio: Math.round(pvp * (1 - pct / 100)), pct };
}

export interface KitLinea {
  titulo: string;
  cantidad: number;
  pvp: number | null; // null = item sin PVP cargado (excluido del total)
  pct: number; // % de tramo aplicado
  unitario: number | null; // precio c/u con tramo
  subtotal: number | null; // unitario × cantidad
  imagenUrl: string | null;
}

export interface KitCalculo {
  lineas: KitLinea[];
  totalUnidades: number;
  subtotalPvp: number; // todo a PVP pleno (para mostrar el ahorro)
  subtotalConTramos: number; // con descuento por tramo de cada producto
  descuentoExtraPct: number;
  descuentoExtraMonto: number;
  total: number; // subtotalConTramos − descuento extra
  ahorroTotal: number; // subtotalPvp − total
  completo: boolean; // false si algún item no tiene PVP
}

/** Primera imagen (no video) de un set de medios mayoristas. */
function primeraImagen(imagenes?: MayoristaImagen[]): string {
  const media = imagenes ?? [];
  const img = media.find((m) => m.tipo !== "video") ?? media[0];
  return img?.url ?? "";
}

/**
 * Construye una línea de carrito a partir de un ítem mayorista suelto.
 * El precio unitario se recalcula por cantidad (tramos) en el carrito.
 */
export function cartItemFromMayoristaItem(
  item: MayoristaItem,
  tramos: MayoristaTramo[],
  listaCodigo: string,
  cantidad: number
): Omit<CartItem, "subtotal"> {
  const pvp = item.precio_pvp ?? 0;
  return {
    producto_id: item.id, // clave de carrito (el ítem mayorista)
    catalogo_producto_id: item.producto_id ?? null,
    nombre: item.titulo,
    slug: "",
    imagen_url: primeraImagen(item.imagenes),
    precio_base: pvp,
    precio_lista: pvp,
    precio_unitario: pvp, // se recalcula por cantidad
    opciones: [],
    cantidad,
    peso_gr: null,
    alto_cm: null,
    ancho_cm: null,
    largo_cm: null,
    mayorista: { listaCodigo, tramos, esKit: false },
  };
}

/**
 * Construye una línea de carrito "combo" a partir de un kit ya calculado.
 * El precio es fijo (incluye el descuento extra del kit); la cantidad
 * multiplica el kit entero. El contenido se guarda en `opciones` para
 * mostrarlo en el carrito, checkout, emails y admin.
 */
export function cartItemFromKit(
  kit: MayoristaKit,
  calc: KitCalculo,
  listaCodigo: string,
  cantidad: number
): Omit<CartItem, "subtotal"> {
  const contenido = calc.lineas
    .map((l) => `${l.cantidad}× ${l.titulo}`)
    .join(" · ");
  const imagen = calc.lineas.find((l) => l.imagenUrl)?.imagenUrl ?? "";
  return {
    producto_id: kit.id, // clave de carrito (el kit)
    catalogo_producto_id: null,
    nombre: kit.nombre,
    slug: "",
    imagen_url: imagen,
    precio_base: calc.total, // precio fijo del kit armado
    precio_lista: calc.subtotalPvp,
    precio_unitario: calc.total,
    opciones: [
      {
        grupo_id: "kit",
        grupo_nombre: "Incluye",
        opcion_id: kit.id,
        opcion_valor: contenido,
        precio_adicional: 0,
      },
    ],
    cantidad,
    peso_gr: null,
    alto_cm: null,
    ancho_cm: null,
    largo_cm: null,
    mayorista: {
      listaCodigo,
      tramos: [],
      esKit: true,
      descuentoExtraPct: calc.descuentoExtraPct,
    },
  };
}

/** Calcula el precio completo de un kit según los tramos de la lista. */
export function calcularKit(
  kit: MayoristaKit,
  tramos: MayoristaTramo[]
): KitCalculo {
  const lineas: KitLinea[] = (kit.items ?? []).map((ki) => {
    const pvp = ki.item?.precio_pvp ?? null;
    const imagen =
      (ki.item?.imagenes ?? []).find((m) => m.tipo !== "video") ??
      (ki.item?.imagenes ?? [])[0];
    if (pvp == null) {
      return {
        titulo: ki.item?.titulo ?? "Producto",
        cantidad: ki.cantidad,
        pvp: null,
        pct: 0,
        unitario: null,
        subtotal: null,
        imagenUrl: imagen?.url ?? null,
      };
    }
    const { precio, pct } = precioUnitario(pvp, tramos, ki.cantidad);
    return {
      titulo: ki.item?.titulo ?? "Producto",
      cantidad: ki.cantidad,
      pvp,
      pct,
      unitario: precio,
      subtotal: precio * ki.cantidad,
      imagenUrl: imagen?.url ?? null,
    };
  });

  const totalUnidades = lineas.reduce((acc, l) => acc + l.cantidad, 0);
  const subtotalPvp = lineas.reduce(
    (acc, l) => acc + (l.pvp != null ? l.pvp * l.cantidad : 0),
    0
  );
  const subtotalConTramos = lineas.reduce(
    (acc, l) => acc + (l.subtotal ?? 0),
    0
  );
  const descuentoExtraPct = Number(kit.descuento_extra_pct) || 0;
  const descuentoExtraMonto = Math.round(
    (subtotalConTramos * descuentoExtraPct) / 100
  );
  const total = subtotalConTramos - descuentoExtraMonto;

  return {
    lineas,
    totalUnidades,
    subtotalPvp,
    subtotalConTramos,
    descuentoExtraPct,
    descuentoExtraMonto,
    total,
    ahorroTotal: subtotalPvp - total,
    completo: lineas.every((l) => l.pvp != null),
  };
}
