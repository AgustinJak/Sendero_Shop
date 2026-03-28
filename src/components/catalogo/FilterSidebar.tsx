"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
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

  return (
    <aside className="space-y-6">
      {activeCount > 0 && (
        <button
          onClick={clearAll}
          className="text-sm text-ambar hover:text-ambar-light transition-colors"
        >
          Limpiar filtros ({activeCount})
        </button>
      )}

      {/* Categorías */}
      {categorias.length > 0 && (
        <FilterSection title="Categoría">
          {categorias.map((cat) => (
            <div key={cat.slug}>
              <FilterCheckbox
                label={cat.nombre}
                checked={currentCategoria === cat.slug}
                onChange={(checked) =>
                  updateFilter("categoria", checked ? cat.slug : null)
                }
              />
              {cat.children && cat.children.length > 0 && (
                <div className="ml-5 mt-1 space-y-1">
                  {cat.children.map((sub) => (
                    <FilterCheckbox
                      key={sub.slug}
                      label={sub.nombre}
                      checked={currentCategoria === sub.slug}
                      onChange={(checked) =>
                        updateFilter("categoria", checked ? sub.slug : null)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </FilterSection>
      )}

      {/* Línea */}
      {filters.lineas.length > 0 && (
        <FilterSection title="Línea">
          {filters.lineas.map((linea) => (
            <FilterCheckbox
              key={linea}
              label={linea}
              checked={searchParams.get("linea") === slugify(linea)}
              onChange={(checked) =>
                updateFilter("linea", checked ? slugify(linea) : null)
              }
            />
          ))}
        </FilterSection>
      )}
    </aside>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FilterCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-lavanda/30 bg-navy-deep text-purpura focus:ring-purpura/50 accent-purpura"
      />
      <span className="text-sm text-lavanda-light group-hover:text-niebla transition-colors">
        {label}
      </span>
    </label>
  );
}
