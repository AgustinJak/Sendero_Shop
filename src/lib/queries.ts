import { createServerSupabaseClient } from "./supabase-server";
import type { Producto, Categoria } from "@/types";

// --- Productos ---

export interface ProductFilters {
  categoria?: string;
  anime?: string;
  personaje?: string;
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
      `*, producto_imagenes(id, url, orden, alt_text), categoria:categorias(id, nombre, slug)`,
      { count: "exact" }
    )
    .eq("activo", true)
    .range(offset, offset + limit - 1);

  if (categoriaIds.length > 0) {
    query = query.in("categoria_id", categoriaIds);
  }
  if (filters.anime) {
    query = query.ilike("anime", filters.anime.replace(/-/g, " "));
  }
  if (filters.personaje) {
    query = query.ilike("personaje", filters.personaje.replace(/-/g, " "));
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
      producto_imagenes(id, url, orden, alt_text),
      categoria:categorias(id, nombre, slug),
      variante_grupos(id, producto_id, nombre, orden,
        opciones:variante_opciones(id, grupo_id, valor, precio_adicional, imagen_url, activo, orden)
      )`
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
    .select(`*, producto_imagenes(id, url, orden, alt_text)`)
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
  animes: string[];
  personajes: string[];
  tamanos: string[];
  precio_min: number;
  precio_max: number;
}

export async function getAvailableFilters(): Promise<AvailableFilters> {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("productos")
    .select("anime, personaje, tamano, precio")
    .eq("activo", true);

  if (!data) {
    return { animes: [], personajes: [], tamanos: [], precio_min: 0, precio_max: 0 };
  }

  const animes = [...new Set(data.map((p) => p.anime).filter(Boolean))] as string[];
  const personajes = [...new Set(data.map((p) => p.personaje).filter(Boolean))] as string[];
  const tamanos = [...new Set(data.map((p) => p.tamano).filter(Boolean))] as string[];
  const precios = data.map((p) => p.precio).filter(Boolean) as number[];

  return {
    animes: animes.sort(),
    personajes: personajes.sort(),
    tamanos: tamanos.sort(),
    precio_min: precios.length ? Math.min(...precios) : 0,
    precio_max: precios.length ? Math.max(...precios) : 0,
  };
}
