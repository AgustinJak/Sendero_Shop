import { createServerSupabaseClient, createServiceRoleClient } from "./supabase-server";
import type { Producto, Categoria, Coleccion, Banner } from "@/types";

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

  // Si hay filtro de categoría por slug, resolver IDs (incluye hijas)
  let categoriaIds: string[] = [];
  if (filters.categoria) {
    // Buscar la categoría padre
    const { data: parent } = await supabase
      .from("categorias")
      .select("id")
      .eq("slug", filters.categoria)
      .single();

    if (parent) {
      // Buscar hijas de esa categoría
      const { data: children } = await supabase
        .from("categorias")
        .select("id")
        .eq("parent_id", parent.id);

      categoriaIds = [parent.id, ...(children?.map((c) => c.id) || [])];
    }
  }

  let query = supabase
    .from("productos")
    .select(
      `*, imagenes:producto_imagenes(id, url, orden, alt_text, tipo), categoria:categorias(id, nombre, slug)`,
      { count: "exact" }
    )
    .eq("activo", true)
    .range(offset, offset + limit - 1);

  if (categoriaIds.length > 0) {
    query = query.in("categoria_id", categoriaIds);
  }
  if (filters.linea) {
    query = query.ilike("linea", filters.linea.replace(/-/g, " "));
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
    return { productos: [], total: 0, page, totalPages: 0 };
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
      imagenes:producto_imagenes(id, url, orden, alt_text, tipo),
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
    .select(`*, imagenes:producto_imagenes(id, url, orden, alt_text, tipo)`)
    .eq("activo", true)
    .eq("destacado", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as unknown as Producto[]) || [];
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

export async function getAvailableFilters(): Promise<AvailableFilters> {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("productos")
    .select("linea, precio")
    .eq("activo", true);

  if (!data) {
    return { lineas: [], precio_min: 0, precio_max: 0 };
  }

  const lineas = [...new Set(data.map((p) => p.linea).filter(Boolean))] as string[];
  const precios = data.map((p) => p.precio).filter(Boolean) as number[];

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
        .select("*, imagenes:producto_imagenes(id, url, orden, alt_text, tipo)")
        .in("id", ids)
        .eq("activo", true);

      // Maintain manual order
      const prodMap = new Map((prods || []).map((p) => [p.id, p]));
      productos = ids
        .map((id) => prodMap.get(id))
        .filter(Boolean) as unknown as Producto[];
    }
  } else if (col.tipo === "automatica" && col.regla) {
    // Build query from rules
    let query = supabase
      .from("productos")
      .select("*, imagenes:producto_imagenes(id, url, orden, alt_text, tipo)")
      .eq("activo", true);

    if (col.regla.linea) query = query.ilike("linea", col.regla.linea);
    if (col.regla.categoria_slug || col.regla.categoria) {
      const catSlug = col.regla.categoria_slug || col.regla.categoria;
      const { data: cat } = await supabase
        .from("categorias")
        .select("id")
        .eq("slug", catSlug)
        .single();
      if (cat) query = query.eq("categoria_id", cat.id);
    }
    if (col.regla.tamano) query = query.eq("tamano", col.regla.tamano);

    query = query.order("created_at", { ascending: false }).limit(50);

    const { data } = await query;
    productos = (data as unknown as Producto[]) || [];
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
