/**
 * Cálculo de precios mayoristas (puro, usable en client y server).
 *
 * Modelo: cada item tiene su PVP; el descuento se aplica por cantidad según
 * los tramos de la lista. En un kit, cada producto usa el tramo de SU
 * cantidad, y al subtotal se le aplica un descuento extra por ser kit.
 */

import type { MayoristaKit, MayoristaTramo } from "@/types";

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
