import { Suspense } from "react";
import type { Metadata } from "next";
import { getProductos, getAvailableFilters, getCategoriasTree, getBanners } from "@/lib/queries";
import ProductGrid from "@/components/productos/ProductGrid";
import TrackItemList from "@/components/productos/TrackItemList";
import FilterSidebar, { MobileFilterToggle } from "@/components/catalogo/CatalogFilters";
import SortSelect from "@/components/catalogo/SortSelect";
import ActiveFilters from "@/components/catalogo/ActiveFilters";
import { FilterTransitionProvider } from "@/components/catalogo/FilterTransitionContext";
import GridLoadingOverlay from "@/components/catalogo/GridLoadingOverlay";
import CatalogBanner from "@/components/home/CatalogBanner";
import { slugify } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Explorá nuestro catálogo de figuras, katanas y accesorios de colección. Envío a todo Argentina.",
  openGraph: {
    title: "Catálogo — Sendero Shop",
    description:
      "Figuras, katanas y accesorios de colección. Filtrá por anime, categoría y precio.",
  },
  alternates: {
    canonical: "https://sendero3d.com/catalogo",
  },
};

interface Props {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function CatalogoPage({ searchParams }: Props) {
  const params = await searchParams;

  const [{ productos, total, page, totalPages }, availableFilters, categorias, catalogoBanners] =
    await Promise.all([
      getProductos({
        categoria: params.categoria,
        linea: params.linea,
        precio_min: params.precio_min ? Number(params.precio_min) : undefined,
        precio_max: params.precio_max ? Number(params.precio_max) : undefined,
        busqueda: params.q,
        orden: params.orden,
        page: params.page ? Number(params.page) : 1,
      }),
      getAvailableFilters({
        categoria: params.categoria,
        busqueda: params.q,
        linea: params.linea,
      }),
      getCategoriasTree(),
      getBanners("catalogo_top"),
    ]);

  // El encabezado refleja lo que el usuario esta mirando. Los slugs vienen
  // de la URL, asi que se buscan los nombres reales en las categorias/lineas
  // cargadas en vez de mostrar el slug crudo.
  const nombreCategoria = params.categoria
    ? categorias.flatMap((c) => [c, ...(c.children ?? [])]).find((c) => c.slug === params.categoria)?.nombre
    : undefined;
  const nombreLinea = params.linea
    ? availableFilters.lineas.find((l) => slugify(l) === params.linea)
    : undefined;
  const filtroActivo = Boolean(nombreCategoria || nombreLinea || params.q);

  const titulo = params.q
    ? `"${params.q}"`
    : [nombreCategoria, nombreLinea].filter(Boolean).join(" · ") || "Catálogo";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Banner catálogo */}
      {catalogoBanners.length > 0 && (
        <CatalogBanner banner={catalogoBanners[0]} />
      )}

      <Suspense>
        <FilterTransitionProvider>
          {/* Header */}
          <div className="flex items-end justify-between gap-6 mb-8">
            <div className="max-w-[52ch]">
              <p className="volanta mb-2">
                {params.q
                  ? "Resultados de búsqueda"
                  : filtroActivo
                    ? "Estás viendo"
                    : "Todo el catálogo"}
              </p>
              <h1 className="display display-seccion text-texto">{titulo}</h1>
              <p className="text-texto-3 mt-3">
                {total === 0
                  ? "No encontramos piezas con estos filtros. Probá quitando alguno."
                  : `${total} ${total === 1 ? "pieza disponible" : "piezas disponibles"}${
                      filtroActivo ? " con los filtros aplicados" : " para elegir"
                    }.`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <MobileFilterToggle filters={availableFilters} categorias={categorias} />
              <Suspense>
                <SortSelect />
              </Suspense>
            </div>
          </div>

          <Suspense>
            <ActiveFilters />
          </Suspense>

          <div className="flex gap-8">
            {/* Sidebar — Desktop */}
            <div className="hidden lg:block w-56 shrink-0">
              <FilterSidebar filters={availableFilters} categorias={categorias} />
            </div>

            {/* Grid */}
            <div className="flex-1">
              <GridLoadingOverlay>
                <ProductGrid productos={productos} />
              </GridLoadingOverlay>
              <TrackItemList
                listName="Catálogo"
                products={productos.map((p) => ({
                  id: p.id,
                  name: p.nombre,
                  price: p.precio_oferta || p.precio,
                  category: (p.categoria as unknown as { nombre: string })?.nombre,
                }))}
              />

              {/* Paginación */}
              {totalPages > 1 && (
                <Pagination current={page} total={totalPages} params={params} />
              )}
            </div>
          </div>
        </FilterTransitionProvider>
      </Suspense>
    </div>
  );
}

function Pagination({
  current,
  total,
  params,
}: {
  current: number;
  total: number;
  params: Record<string, string | undefined>;
}) {
  function pageUrl(page: number) {
    const p = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value && key !== "page") p.set(key, value);
    }
    if (page > 1) p.set("page", String(page));
    const qs = p.toString();
    return `/catalogo${qs ? `?${qs}` : ""}`;
  }

  return (
    <nav className="flex justify-center gap-2 mt-12">
      {current > 1 && (
        <a
          href={pageUrl(current - 1)}
          className="px-4 py-2 border border-linea rounded-lg text-sm text-lavanda-light hover:bg-lavanda/10 transition-colors"
        >
          Anterior
        </a>
      )}

      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <a
          key={p}
          href={pageUrl(p)}
          className={`px-4 py-2 rounded-lg text-sm transition-colors ${
            p === current
              ? "bg-purpura text-niebla"
              : "border border-linea text-lavanda-light hover:bg-lavanda/10"
          }`}
        >
          {p}
        </a>
      ))}

      {current < total && (
        <a
          href={pageUrl(current + 1)}
          className="px-4 py-2 border border-linea rounded-lg text-sm text-lavanda-light hover:bg-lavanda/10 transition-colors"
        >
          Siguiente
        </a>
      )}
    </nav>
  );
}
