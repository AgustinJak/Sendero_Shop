/**
 * Recálculo autoritativo de precios en el servidor.
 *
 * El navegador manda el carrito, pero **nunca** confiamos en los precios que
 * vienen en el body: acá se vuelve a resolver cada línea contra la base
 * (producto de catálogo, ítem mayorista o kit) y se re-aplica el descuento por
 * cantidad. Lo único que se toma del cliente son los identificadores y las
 * cantidades.
 */

import "server-only";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getSiteConfig } from "@/lib/site-config";
import { calcularKit, precioUnitario } from "@/lib/mayorista";
import type {
  MayoristaKit,
  MayoristaTramo,
  VarianteSeleccion,
} from "@/types";

/** Línea tal como la manda el cliente (solo se usan ids y cantidad). */
export interface ItemEntrada {
  producto_id?: string | null;
  catalogo_producto_id?: string | null;
  nombre?: string;
  cantidad?: number;
  opciones?: VarianteSeleccion[];
}

/** Línea ya preciada por el servidor, lista para insertar en `pedido_items`. */
export interface ItemPreciado {
  producto_id: string | null;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  opciones_seleccionadas: VarianteSeleccion[];
  subtotal: number;
}

export interface PreciosResueltos {
  items: ItemPreciado[];
  subtotal: number;
}

/** Cantidad válida: entero entre 1 y 999. */
function normalizarCantidad(n: unknown): number | null {
  const cant = Math.floor(Number(n));
  if (!Number.isFinite(cant) || cant < 1 || cant > 999) return null;
  return cant;
}

/**
 * Precio adicional efectivo de una opción, replicando la lógica del selector de
 * variantes: si hay una regla condicional activada por otra opción elegida,
 * gana la regla; si no, el adicional base de la opción.
 */
function adicionalEfectivo(
  opcionId: string,
  adicionalBase: number,
  otrasOpcionIds: string[],
  reglas: { opcion_id: string; cuando_opcion_id: string; precio_adicional: number }[]
): number {
  const reglasOpcion = reglas.filter((r) => r.opcion_id === opcionId);
  if (reglasOpcion.length === 0) return adicionalBase;
  const activa = reglasOpcion.find((r) =>
    otrasOpcionIds.includes(r.cuando_opcion_id)
  );
  return activa ? Number(activa.precio_adicional) : adicionalBase;
}

/**
 * Resuelve el precio real de cada línea del carrito contra la base de datos.
 * Lanza si una línea no corresponde a nada vendible.
 */
export async function resolverPrecios(
  entrada: ItemEntrada[]
): Promise<PreciosResueltos> {
  if (!Array.isArray(entrada) || entrada.length === 0) {
    throw new Error("El carrito está vacío");
  }
  if (entrada.length > 100) {
    throw new Error("Demasiados items en el pedido");
  }

  const db = await createServiceRoleClient();
  const { descuento_tramos: tramosGlobales } = await getSiteConfig();

  const items: ItemPreciado[] = [];

  for (const linea of entrada) {
    const cantidad = normalizarCantidad(linea.cantidad);
    if (cantidad === null) {
      throw new Error("Cantidad inválida en el pedido");
    }

    const idCatalogo = linea.catalogo_producto_id || linea.producto_id;
    const idLinea = linea.producto_id || linea.catalogo_producto_id;
    if (!idLinea) throw new Error("Item sin identificar en el pedido");

    // 1) Producto del catálogo
    const preciado =
      (await preciarProductoCatalogo(db, idCatalogo, linea, cantidad, tramosGlobales)) ??
      // 2) Ítem mayorista suelto
      (await preciarItemMayorista(db, idLinea, cantidad, tramosGlobales)) ??
      // 3) Kit mayorista (precio armado, sin tramo por cantidad)
      (await preciarKitMayorista(db, idLinea, cantidad));

    if (!preciado) {
      throw new Error(`Producto no disponible: ${linea.nombre ?? idLinea}`);
    }

    items.push(preciado);
  }

  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
  return { items, subtotal };
}

type Db = Awaited<ReturnType<typeof createServiceRoleClient>>;

async function preciarProductoCatalogo(
  db: Db,
  productoId: string | null | undefined,
  linea: ItemEntrada,
  cantidad: number,
  tramosGlobales: MayoristaTramo[]
): Promise<ItemPreciado | null> {
  if (!productoId) return null;

  const { data: producto } = await db
    .from("productos")
    .select("id, nombre, precio, precio_oferta, activo")
    .eq("id", productoId)
    .maybeSingle();

  if (!producto) return null;
  if (producto.activo === false) {
    throw new Error(`"${producto.nombre}" ya no está disponible`);
  }

  const base = Number(producto.precio_oferta) || Number(producto.precio);

  // Adicionales por variantes: se recalculan desde la base, ignorando los
  // valores que vinieron del cliente.
  const opcionesPedidas = Array.isArray(linea.opciones) ? linea.opciones : [];
  let adicionales = 0;
  const opcionesFinales: VarianteSeleccion[] = [];

  if (opcionesPedidas.length > 0) {
    const [{ data: grupos }, { data: reglas }] = await Promise.all([
      db
        .from("variante_grupos")
        .select("id, nombre, opciones:variante_opciones(id, valor, precio_adicional)")
        .eq("producto_id", producto.id),
      db
        .from("variante_precio_reglas")
        .select("opcion_id, cuando_opcion_id, precio_adicional")
        .eq("producto_id", producto.id),
    ]);

    type OpcionDb = { id: string; valor: string; precio_adicional: number };
    type GrupoDb = { id: string; nombre: string; opciones: OpcionDb[] | null };

    const idsPedidos = opcionesPedidas.map((o) => o.opcion_id);

    for (const sel of opcionesPedidas) {
      let encontrada: { grupo: GrupoDb; opcion: OpcionDb } | null = null;
      for (const g of (grupos ?? []) as GrupoDb[]) {
        const op = (g.opciones ?? []).find((o) => o.id === sel.opcion_id);
        if (op) {
          encontrada = { grupo: g, opcion: op };
          break;
        }
      }

      // Opción que no pertenece a este producto: no suma precio, pero se
      // conserva la etiqueta para no perder el dato del pedido.
      if (!encontrada) {
        console.warn(
          `Opción desconocida ${sel.opcion_id} para producto ${producto.id}`
        );
        opcionesFinales.push({ ...sel, precio_adicional: 0 });
        continue;
      }

      const otras = idsPedidos.filter((id) => id !== sel.opcion_id);
      const adicional = adicionalEfectivo(
        encontrada.opcion.id,
        Number(encontrada.opcion.precio_adicional) || 0,
        otras,
        (reglas ?? []) as {
          opcion_id: string;
          cuando_opcion_id: string;
          precio_adicional: number;
        }[]
      );

      adicionales += adicional;
      opcionesFinales.push({
        grupo_id: encontrada.grupo.id,
        grupo_nombre: encontrada.grupo.nombre,
        opcion_id: encontrada.opcion.id,
        opcion_valor: encontrada.opcion.valor,
        precio_adicional: adicional,
      });
    }
  }

  const lista = base + adicionales;
  const { precio: unitario } = precioUnitario(lista, tramosGlobales, cantidad);

  return {
    producto_id: producto.id,
    nombre_producto: producto.nombre,
    cantidad,
    precio_unitario: unitario,
    opciones_seleccionadas: opcionesFinales,
    subtotal: unitario * cantidad,
  };
}

async function preciarItemMayorista(
  db: Db,
  itemId: string,
  cantidad: number,
  tramosGlobales: MayoristaTramo[]
): Promise<ItemPreciado | null> {
  const { data: item } = await db
    .from("mayorista_items")
    .select(
      "id, titulo, precio_pvp, producto_id, seccion:mayorista_secciones(lista:mayorista_listas(activa, descuento_tramos))"
    )
    .eq("id", itemId)
    .maybeSingle();

  if (!item || item.precio_pvp == null) return null;

  const lista = extraerLista(item.seccion);
  if (lista && lista.activa === false) {
    throw new Error(`"${item.titulo}" ya no está disponible`);
  }

  const tramos = normalizarTramos(lista?.descuento_tramos) ?? tramosGlobales;
  const pvp = Number(item.precio_pvp);
  const { precio: unitario } = precioUnitario(pvp, tramos, cantidad);

  return {
    producto_id: item.producto_id ?? null,
    nombre_producto: item.titulo,
    cantidad,
    precio_unitario: unitario,
    opciones_seleccionadas: [],
    subtotal: unitario * cantidad,
  };
}

async function preciarKitMayorista(
  db: Db,
  kitId: string,
  cantidad: number
): Promise<ItemPreciado | null> {
  const { data: kit } = await db
    .from("mayorista_kits")
    .select(
      `id, nombre, descripcion, descuento_extra_pct, orden, lista_id,
       lista:mayorista_listas(activa, descuento_tramos),
       items:mayorista_kit_items(id, kit_id, item_id, cantidad,
         item:mayorista_items(id, titulo, precio_pvp))`
    )
    .eq("id", kitId)
    .maybeSingle();

  if (!kit) return null;

  const lista = Array.isArray(kit.lista) ? kit.lista[0] : kit.lista;
  if (lista && (lista as { activa?: boolean }).activa === false) {
    throw new Error(`El kit "${kit.nombre}" ya no está disponible`);
  }

  const tramos =
    normalizarTramos((lista as { descuento_tramos?: unknown })?.descuento_tramos) ?? [];
  const calc = calcularKit(kit as unknown as MayoristaKit, tramos);

  if (!calc.completo || calc.total <= 0) {
    throw new Error(`El kit "${kit.nombre}" no está disponible para comprar`);
  }

  const contenido = calc.lineas
    .map((l) => `${l.cantidad}× ${l.titulo}`)
    .join(" · ");

  return {
    producto_id: null,
    nombre_producto: `Kit: ${kit.nombre}`,
    cantidad,
    // El precio del kit ya incluye su descuento extra: no lleva tramo por cantidad.
    precio_unitario: calc.total,
    opciones_seleccionadas: [
      {
        grupo_id: "kit",
        grupo_nombre: "Incluye",
        opcion_id: kit.id,
        opcion_valor: contenido,
        precio_adicional: 0,
      },
    ],
    subtotal: calc.total * cantidad,
  };
}

/** Supabase devuelve el join como objeto o array según la relación. */
function extraerLista(
  seccion: unknown
): { activa?: boolean; descuento_tramos?: unknown } | null {
  const s = Array.isArray(seccion) ? seccion[0] : seccion;
  if (!s || typeof s !== "object") return null;
  const lista = (s as { lista?: unknown }).lista;
  const l = Array.isArray(lista) ? lista[0] : lista;
  return (l as { activa?: boolean; descuento_tramos?: unknown }) ?? null;
}

function normalizarTramos(raw: unknown): MayoristaTramo[] | null {
  if (!Array.isArray(raw)) return null;
  const tramos = raw
    .map((t) => ({ min: Number(t?.min), pct: Number(t?.pct) }))
    .filter((t) => Number.isFinite(t.min) && Number.isFinite(t.pct) && t.min > 0 && t.pct > 0);
  return tramos.length > 0 ? tramos : null;
}
