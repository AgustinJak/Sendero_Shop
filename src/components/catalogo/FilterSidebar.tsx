"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import type { AvailableFilters } from "@/lib/queries";
import type { Categoria } from "@/types";
import { slugify } from "@/lib/utils";

interface FilterSidebarProps {
  filters: AvailableFilters;
  categorias?: Categoria[];
}

export default function FilterSidebar({ filters, categorias = [] }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const clearAll = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  const activeCount = Array.from(searchParams.keys()).filter(
    (k) => k !== "orden" && k !== "page"
  ).length;

  const currentCategoria = searchParams.get("categoria");
  const currentLinea = searchParams.get("linea");

  // Flatten categories into a flat list for pill display
  const allCats: { slug: string; nombre: string; isChild: boolean }[] = [];
  for (const cat of categorias) {
    allCats.push({ slug: cat.slug, nombre: cat.nombre, isChild: false });
    if (cat.children) {
      for (const sub of cat.children) {
        allCats.push({ slug: sub.slug, nombre: sub.nombre, isChild: true });
      }
    }
  }

  return (
    <aside className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-cinzel)] text-xs font-bold text-niebla uppercase tracking-widest">
          Filtros
        </h2>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-ambar hover:text-ambar-light transition-colors"
          >
            Limpiar ({activeCount})
          </button>
        )}
      </div>

      <div className="h-px bg-gradient-to-r from-purpura/30 via-lavanda/10 to-transparent" />

      {/* Categorías as pills */}
      {allCats.length > 0 && (
        <FilterSection title="Categoría">
          <div className="flex flex-wrap gap-2">
            {allCats.map((cat) => (
              <FilterPill
                key={cat.slug}
                label={cat.nombre}
                active={currentCategoria === cat.slug}
                onClick={() =>
                  updateFilter(
                    "categoria",
                    currentCategoria === cat.slug ? null : cat.slug
                  )
                }
              />
            ))}
          </div>
        </FilterSection>
      )}

      {/* Línea as pills */}
      {filters.lineas.length > 0 && (
        <FilterSection title="Línea">
          <div className="flex flex-wrap gap-2">
            {filters.lineas.map((linea) => {
              const slug = slugify(linea);
              return (
                <FilterPill
                  key={linea}
                  label={linea}
                  active={currentLinea === slug}
                  onClick={() =>
                    updateFilter("linea", currentLinea === slug ? null : slug)
                  }
                />
              );
            })}
          </div>
        </FilterSection>
      )}
    </aside>
  );
}

/* ── Mobile Filter Button + Drawer ── */

export function MobileFilterToggle({
  filters,
  categorias,
}: FilterSidebarProps) {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();

  const activeCount = Array.from(searchParams.keys()).filter(
    (k) => k !== "orden" && k !== "page"
  ).length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden flex items-center gap-2 px-4 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light hover:border-purpura/40 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        Filtros
        {activeCount > 0 && (
          <span className="bg-purpura text-niebla text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
            {activeCount}
          </span>
        )}
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-navy rounded-t-2xl p-6 max-h-[70vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla">
                Filtros
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-lavanda/60 hover:text-niebla transition-colors text-lg"
              >
                ×
              </button>
            </div>
            <FilterSidebar filters={filters} categorias={categorias} />
          </div>
        </div>
      )}
    </>
  );
}

/* ── Subcomponents ── */

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-lavanda/50 uppercase tracking-wider mb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 ${
        active
          ? "bg-purpura text-niebla shadow-sm shadow-purpura/20"
          : "bg-lavanda/5 text-lavanda-light border border-lavanda/15 hover:border-purpura/40 hover:text-niebla hover:bg-lavanda/10"
      }`}
    >
      {label}
    </button>
  );
}
