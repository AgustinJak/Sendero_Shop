import { Suspense } from "react";
import type { Metadata } from "next";
import { getProductos, getAvailableFilters, getCategoriasTree, getBanners } from "@/lib/queries";
import ProductGrid from "@/components/productos/ProductGrid";
import TrackItemList from "@/components/productos/TrackItemList";
import FilterSidebar from "@/components/catalogo/FilterSidebar";
import SortSelect from "@/components/catalogo/SortSelect";
import CatalogBanner from "@/components/home/CatalogBanner";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Explorá nuestro catálogo de figuras, katanas y accesorios impresos en 3D. Envío a todo Argentina.",
  openGraph: {
    title: "Catálogo — Sendero Shop",
    description:
      "Figuras, katanas y accesorios impresos en 3D. Filtrá por anime, categoría y precio.",
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
      getAvailableFilters(),
      getCategoriasTree(),
      getBanners("catalogo_top"),
    ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Banner catálogo */}
      {catalogoBanners.length > 0 && (
        <CatalogBanner banner={catalogoBanners[0]} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-[family-name:var(--font-cinzel)] text-2xl sm:text-3xl font-bold text-niebla">
            Catálogo
          </h1>
          <p className="text-lavanda/60 text-sm mt-1">
            {total} {total === 1 ? "producto" : "productos"}
          </p>
        </div>

        <Suspense>
          <SortSelect />
        </Suspense>
      </div>

      <div className="flex gap-8">
        {/* Sidebar — Desktop */}
        <div className="hidden lg:block w-56 shrink-0">
          <Suspense>
            <FilterSidebar filters={availableFilters} categorias={categorias} />
          </Suspense>
        </div>

        {/* Grid */}
        <div className="flex-1">
          <ProductGrid productos={productos} />
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
          className="px-4 py-2 border border-lavanda/20 rounded-lg text-sm text-lavanda-light hover:bg-lavanda/10 transition-colors"
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
              : "border border-lavanda/20 text-lavanda-light hover:bg-lavanda/10"
          }`}
        >
          {p}
        </a>
      ))}

      {current < total && (
        <a
          href={pageUrl(current + 1)}
          className="px-4 py-2 border border-lavanda/20 rounded-lg text-sm text-lavanda-light hover:bg-lavanda/10 transition-colors"
        >
          Siguiente
        </a>
      )}
    </nav>
  );
}
