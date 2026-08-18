import { createServerSupabaseClient, createServiceRoleClient } from "./supabase-server";
import { slugify } from "./utils";
import type { Producto, Categoria, Coleccion, Banner } from "@/types";

// --- Resolución de slugs ---

/**
 * Slug de categoría → IDs de esa categoría y sus hijas.
 * Devuelve `[]` si el slug no existe (el llamador debe tratarlo como
 * "ningún producto", no como "sin filtro").
 */
async function categoriaIdsPorSlug(slug: string): Promise<string[]> {
  const supabase = await createServerSupabaseClient();

  const { data: parent } = await supabase
    .from("categorias")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!parent) return [];

  const { data: children } = await supabase
    .from("categorias")
    .select("id")
    .eq("parent_id", parent.id);

  return [parent.id, ...(children?.map((c) => c.id) || [])];
}

/**
 * Slug de línea → el valor real guardado en `productos.linea`.
 *
 * No alcanza con des-slugificar el slug (cambiar `-` por espacios): "Re:Zero"
 * y "Decoración" pierden caracteres al slugificar y nunca vuelven a matchear,
 * así que el filtro devolvía 0 productos. Se resuelve comparando slug contra
 * slug sobre las líneas que existen.
 */
async function lineaPorSlug(slug: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("productos")
    .select("linea")
    .eq("activo", true)
    .not("linea", "is", null);

  const match = (data ?? []).find((p) => p.linea && slugify(p.linea) === slug);
  return match?.linea ?? null;
}

// --- Productos ---

export interface ProductFilters {
  categoria?: string;
  linea?: string;
  precio_min?: number;
  precio_max?: number;
  tamano?: string;
  busqueda?: string;
  orden?: string;
  page?: number;
  limit?: number;
}

export interface ProductosResult {
  productos: Producto[];
  total: number;
  page: number;
  totalPages: number;
}

export async function getProductos(
  filters: ProductFilters = {}
): Promise<ProductosResult> {
  const supabase = await createServerSupabaseClient();
  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  const vacio = { productos: [], total: 0, page, totalPages: 0 };

  // Si hay filtro de categoría por slug, resolver IDs (incluye hijas).
  // Un slug inexistente significa "no hay nada que mostrar": antes se caía al
  // caso sin filtro y devolvía el catálogo entero.
  let categoriaIds: string[] = [];
  if (filters.categoria) {
    categoriaIds = await categoriaIdsPorSlug(filters.categoria);
    if (categoriaIds.length === 0) return vacio;
  }

  let linea: string | null = null;
  if (filters.linea) {
    linea = await lineaPorSlug(filters.linea);
    if (!linea) return vacio;
  }

  let query = supabase
    .from("productos")
    .select(
      `*, imagenes:producto_imagenes(id, url, orden, alt_text, tipo, opcion_id), categoria:categorias(id, nombre, slug)`,
      { count: "exact" }
    )
    .eq("activo", true)
    .range(offset, offset + limit - 1);

  if (categoriaIds.length > 0) {
    query = query.in("categoria_id", categoriaIds);
  }
  if (linea) {
    query = query.eq("linea", linea);
  }
  if (filters.precio_min) {
    query = query.gte("precio", filters.precio_min);
  }
  if (filters.precio_max) {
    query = query.lte("precio", filters.precio_max);
  }
  if (filters.tamano) {
    query = query.eq("tamano", filters.tamano);
  }
  if (filters.busqueda) {
    query = query.ilike("nombre", `%${filters.busqueda}%`);
  }

  // Ordenamiento
  switch (filters.orden) {
    case "precio-asc":
      query = query.order("precio", { ascending: true });
      break;
    case "precio-desc":
      query = query.order("precio", { ascending: false });
      break;
    case "nombre":
      query = query.order("nombre", { ascending: true });
      break;
    case "nuevo":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query
        .order("destacado", { ascending: false })
        .order("created_at", { ascending: false });
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching productos:", error);
    return vacio;
  }

  return {
    productos: (data as unknown as Producto[]) || [],
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

export async function getProductoBySlug(
  slug: string
): Promise<Producto | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("productos")
    .select(
      `*,
      imagenes:producto_imagenes(id, url, orden, alt_text, tipo, opcion_id),
      categoria:categorias(id, nombre, slug),
      variante_grupos(id, producto_id, nombre, orden,
        opciones:variante_opciones(id, grupo_id, valor, precio_adicional, imagen_url, activo, orden)
      ),
      precio_reglas:variante_precio_reglas(id, producto_id, opcion_id, cuando_opcion_id, precio_adicional)`
    )
    .eq("slug", slug)
    .eq("activo", true)
    .single();

  if (error) return null;
  return data as unknown as Producto;
}

export async function getProductosDestacados(
  limit = 8
): Promise<Producto[]> {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("productos")
    .select(`*, imagenes:producto_imagenes(id, url, orden, alt_text, tipo, opcion_id)`)
    .eq("activo", true)
    .eq("destacado", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as unknown as Producto[]) || [];
}

/**
 * Productos relacionados a uno dado, para "Te puede interesar".
 * Prioridad: misma línea/franquicia → misma categoría → novedades (relleno).
 * Excluye el producto actual y evita duplicados.
 */
export async function getProductosRelacionados(
  producto: Pick<Producto, "id" | "linea" | "categoria_id">,
  limit = 4
): Promise<Producto[]> {
  const supabase = await createServerSupabaseClient();
  const select = `*, imagenes:producto_imagenes(id, url, orden, alt_text, tipo, opcion_id)`;
  const collected = new Map<string, Producto>();

  function add(rows: Producto[] | null) {
    for (const p of rows ?? []) {
      if (p.id === producto.id || collected.has(p.id)) continue;
      if (collected.size >= limit) break;
      collected.set(p.id, p);
    }
  }

  // 1) Misma línea / franquicia (más vendidos primero)
  if (producto.linea) {
    const { data } = await supabase
      .from("productos")
      .select(select)
      .eq("activo", true)
      .eq("linea", producto.linea)
      .order("unidades_vendidas", { ascending: false })
      .limit(limit + 4);
    add(data as unknown as Producto[]);
  }

  // 2) Misma categoría
  if (collected.size < limit && producto.categoria_id) {
    const { data } = await supabase
      .from("productos")
      .select(select)
      .eq("activo", true)
      .eq("categoria_id", producto.categoria_id)
      .order("unidades_vendidas", { ascending: false })
      .limit(limit + 4);
    add(data as unknown as Producto[]);
  }

  // 3) Relleno con novedades
  if (collected.size < limit) {
    const { data } = await supabase
      .from("productos")
      .select(select)
      .eq("activo", true)
      .order("created_at", { ascending: false })
      .limit(limit + 4);
    add(data as unknown as Producto[]);
  }

  return Array.from(collected.values()).slice(0, limit);
}

/**
 * Devuelve la lista mayorista ACTIVA que contiene a un producto (o null).
 * El vínculo es mayorista_items.producto_id → sección → lista.
 * La RLS pública de mayorista_listas ya filtra solo las activas.
 */
export async function getListaMayoristaDeProducto(
  productoId: string
): Promise<{ codigo: string; nombre: string } | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("mayorista_items")
    .select("seccion:mayorista_secciones(lista:mayorista_listas(codigo, nombre, activa))")
    .eq("producto_id", productoId);

  for (const row of data ?? []) {
    const seccion = row.seccion as unknown as {
      lista?: { codigo: string; nombre: string; activa: boolean };
    } | null;
    const lista = seccion?.lista;
    if (lista?.activa) return { codigo: lista.codigo, nombre: lista.nombre };
  }
  return null;
}

// --- Categorías ---

export async function getCategorias(): Promise<Categoria[]> {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("categorias")
    .select("*")
    .eq("activo", true)
    .order("orden", { ascending: true });

  return (data as Categoria[]) || [];
}

export async function getCategoriasTree(): Promise<Categoria[]> {
  const categorias = await getCategorias();

  const roots = categorias.filter((c) => !c.parent_id);
  return roots.map((root) => ({
    ...root,
    children: categorias.filter((c) => c.parent_id === root.id),
  }));
}

// --- Filtros disponibles (para sidebar) ---

export interface AvailableFilters {
  lineas: string[];
  precio_min: number;
  precio_max: number;
}

/** Filtros ya aplicados, para acotar las opciones que se ofrecen. */
export interface FiltrosDeContexto {
  categoria?: string;
  busqueda?: string;
  /** Slug de la línea activa. */
  linea?: string;
}

/**
 * Opciones que tiene sentido ofrecer en el sidebar dado lo ya filtrado.
 *
 * Las líneas se acotan al contexto: parado en Armas no se ofrece BTS, porque
 * no existe ningún producto Armas + BTS y elegirlo dejaría el grid vacío.
 */
export async function getAvailableFilters(
  contexto: FiltrosDeContexto = {}
): Promise<AvailableFilters> {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("productos")
    .select("nombre, linea, precio, categoria_id")
    .eq("activo", true);

  if (!data) {
    return { lineas: [], precio_min: 0, precio_max: 0 };
  }

  // Slug inexistente → array vacío → ningún producto entra en contexto, igual
  // que en getProductos().
  const categoriaIds = contexto.categoria
    ? await categoriaIdsPorSlug(contexto.categoria)
    : null;
  const busqueda = contexto.busqueda?.toLowerCase();

  // El filtro de línea NO se aplica acá a propósito: si se aplicara quedaría
  // solo la línea elegida y no habría forma de saltar a otra sin limpiarla.
  const enContexto = data.filter((p) => {
    if (categoriaIds && !categoriaIds.includes(p.categoria_id as string)) return false;
    if (busqueda && !(p.nombre as string).toLowerCase().includes(busqueda)) return false;
    return true;
  });

  const lineas = [...new Set(enContexto.map((p) => p.linea).filter(Boolean))] as string[];

  // La línea activa se conserva aunque el contexto la deje sin productos, para
  // poder destildarla desde el sidebar en vez de quedar con el grid vacío y el
  // filtro desaparecido.
  if (contexto.linea && !lineas.some((l) => slugify(l) === contexto.linea)) {
    const activa = data.find((p) => p.linea && slugify(p.linea) === contexto.linea);
    if (activa?.linea) lineas.push(activa.linea as string);
  }

  const precios = enContexto.map((p) => p.precio).filter(Boolean) as number[];

  return {
    lineas: lineas.sort(),
    precio_min: precios.length ? Math.min(...precios) : 0,
    precio_max: precios.length ? Math.max(...precios) : 0,
  };
}

// --- Colecciones ---

export async function getColecciones(): Promise<Coleccion[]> {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("colecciones")
    .select("*")
    .eq("activa", true)
    .order("orden", { ascending: true });

  return (data as Coleccion[]) || [];
}

export async function getColeccionBySlug(
  slug: string
): Promise<(Coleccion & { productos: Producto[] }) | null> {
  const supabase = await createServerSupabaseClient();

  const { data: coleccion, error } = await supabase
    .from("colecciones")
    .select("*")
    .eq("slug", slug)
    .eq("activa", true)
    .single();

  if (error || !coleccion) return null;

  const col = coleccion as Coleccion;
  let productos: Producto[] = [];

  if (col.tipo === "manual") {
    // Fetch manually assigned products
    const { data } = await supabase
      .from("coleccion_productos")
      .select("producto_id, orden")
      .eq("coleccion_id", col.id)
      .order("orden", { ascending: true });

    if (data && data.length > 0) {
      const ids = data.map((cp) => cp.producto_id);
      const { data: prods } = await supabase
        .from("productos")
        .select("*, imagenes:producto_imagenes(id, url, orden, alt_text, tipo, opcion_id)")
        .in("id", ids)
        .eq("activo", true);

      // Maintain manual order
      const prodMap = new Map((prods || []).map((p) => [p.id, p]));
      productos = ids
        .map((id) => prodMap.get(id))
        .filter(Boolean) as unknown as Producto[];
    }
  } else if (col.tipo === "automatica" && col.regla) {
    // Cada campo acepta CSV: "Kpop, K4os" incluye productos de cualquiera de
    // las dos líneas. Antes se usaba ILIKE con el string completo, que solo
    // matcheaba un producto con la línea literal "Kpop, K4os" (inexistente).
    const csv = (v: string | undefined) =>
      (v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    let query = supabase
      .from("productos")
      .select("*, imagenes:producto_imagenes(id, url, orden, alt_text, tipo, opcion_id)")
      .eq("activo", true);

    const lineas = csv(col.regla.linea);
    if (lineas.length) query = query.in("linea", lineas);

    const catSlugRaw = col.regla.categoria_slug || col.regla.categoria;
    const catSlugs = csv(catSlugRaw);
    let saltarQuery = false;
    if (catSlugs.length) {
      const { data: cats } = await supabase
        .from("categorias")
        .select("id")
        .in("slug", catSlugs);
      const catIds = (cats ?? []).map((c: { id: string }) => c.id);
      // Sin categorías matcheadas: la regla no aplica a ningún producto.
      // Saltar la query en vez de correrla sin este filtro (que devolvería
      // todo el catálogo). La página de la colección se muestra vacía, no 404.
      if (catIds.length === 0) saltarQuery = true;
      else query = query.in("categoria_id", catIds);
    }

    const tamanos = csv(col.regla.tamano);
    if (tamanos.length) query = query.in("tamano", tamanos);

    if (!saltarQuery) {
      query = query.order("created_at", { ascending: false }).limit(50);
      const { data } = await query;
      productos = (data as unknown as Producto[]) || [];
    }
  }

  return { ...col, productos };
}

// --- Banners ---

export async function getBanners(
  posicion?: Banner["posicion"]
): Promise<Banner[]> {
  const supabase = await createServerSupabaseClient();
  const now = new Date().toISOString();

  let query = supabase
    .from("banners")
    .select("*")
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (posicion) {
    query = query.eq("posicion", posicion);
  }

  // Filter by date range (null means no limit)
  query = query.or(`fecha_inicio.is.null,fecha_inicio.lte.${now}`);
  query = query.or(`fecha_fin.is.null,fecha_fin.gte.${now}`);

  const { data } = await query;
  return (data as Banner[]) || [];
}

/**
 * Total de unidades vendidas, para la prueba social del hero.
 *
 * Se lee de la base en vez de hardcodear un número: una cifra escrita a mano
 * en el JSX envejece mal y termina siendo mentira sin que nadie se entere.
 */
export async function getUnidadesVendidas(): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.from("productos").select("unidades_vendidas");
  return (data ?? []).reduce((acc, p) => acc + (Number(p.unidades_vendidas) || 0), 0);
}
