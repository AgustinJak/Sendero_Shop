import { createServiceRoleClient } from "@/lib/supabase-server";

/**
 * SKU de producto.
 *
 * Desde el **2026-08-26** el shop ya no genera SKUs: los genera el inventario
 * y acá se cargan a mano con el valor que él da. Ver la nota "Convención de
 * SKU" en el vault.
 *
 * El motivo es que un SKU identifica una **combinación vendible con costo de
 * fabricación propio** ("Tanjiro Katana · 95cm · Con Funda"), y ese dato solo
 * existe en el inventario. El shop es un canal más: un producto que se vende
 * únicamente en Mercado Libre nacía sin SKU con el esquema viejo.
 *
 * Formato nuevo, sin prefijo de canal: `KAT-TANJI-95-CF`. El `SS-` de antes
 * significaba "Sendero Shop" y el mismo producto también se vende en ML.
 */

/**
 * Normaliza el SKU para guardar: mayúsculas y sin espacios en los extremos.
 * Un SKU vacío se guarda como `null`, no como cadena vacía — si no, dos
 * productos sin SKU chocarían entre sí al validar unicidad.
 */
export function normalizarSku(valor: unknown): string | null {
  const s = String(valor ?? "").trim().toUpperCase();
  return s.length > 0 ? s : null;
}

/**
 * Verifica que el SKU no esté tomado por otro producto.
 *
 * La comparación es case-insensitive por regla de la convención. Como los SKUs
 * se guardan siempre en mayúsculas, alcanza con comparar contra el valor ya
 * normalizado; el `ilike` cubre además las filas viejas que hayan quedado en
 * minúscula antes de esta regla.
 *
 * @param excluirId id del producto que se está editando, para que no choque
 *                  consigo mismo.
 * @returns el nombre del producto que ya lo usa, o `null` si está libre.
 */
export async function skuEnUso(
  sku: string,
  excluirId?: string
): Promise<string | null> {
  const service = await createServiceRoleClient();
  let query = service.from("productos").select("id, nombre").ilike("sku", sku);
  if (excluirId) query = query.neq("id", excluirId);

  const { data } = await query.limit(1);
  return data?.[0]?.nombre ?? null;
}
