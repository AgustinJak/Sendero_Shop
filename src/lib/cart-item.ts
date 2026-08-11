/**
 * Construcción de la línea de carrito a partir de un producto del catálogo.
 *
 * Vive acá para que el botón "Agregar al carrito" y los atajos por tramo
 * usen exactamente la misma lógica, sin dos versiones que se desincronicen.
 */

import type { CartItem, Producto, VarianteSeleccion } from "@/types";

export function buildCartItem(
  producto: Producto,
  selecciones: VarianteSeleccion[],
  precioUnitario: number,
  cantidad: number
): Omit<CartItem, "subtotal"> {
  const imagen = producto.imagenes
    ?.filter((i) => i.tipo !== "video")
    .sort((a, b) => a.orden - b.orden)[0];

  return {
    producto_id: producto.id,
    nombre: producto.nombre,
    slug: producto.slug,
    imagen_url: imagen?.url || "",
    precio_base: producto.precio,
    opciones: selecciones,
    cantidad,
    precio_unitario: precioUnitario,
    peso_gr: producto.peso_gr,
    alto_cm: producto.alto_cm,
    ancho_cm: producto.ancho_cm,
    largo_cm: producto.largo_cm,
  };
}

/** Faltan variantes obligatorias por elegir. */
export function faltanVariantes(
  producto: Producto,
  selecciones: VarianteSeleccion[]
): boolean {
  const requeridos = producto.variante_grupos?.length || 0;
  return requeridos > 0 && selecciones.length < requeridos;
}
