"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useFilterTransition } from "./FilterTransitionContext";
import type { AvailableFilters } from "@/lib/queries";
import type { Categoria } from "@/types";
import { slugify } from "@/lib/utils";

/*
 * Las animaciones son CSS (ver "Filtros del catálogo" en globals.css). Antes
 * eran GSAP, que sumaba 81 KB de JS al catálogo para entradas, un acordeón y
 * un brillo — todo lo que CSS hace solo.
 */

interface FilterSidebarProps {
  filters: AvailableFilters;
  categorias?: Categoria[];
  hideHeader?: boolean;
}

export default function FilterSidebar({ filters, categorias = [], hideHeader = false }: FilterSidebarProps) {
  const { updateFilter, clearAll, isPending } = useFilterTransition();
  const searchParams = useSearchParams();

  // Optimistic local state — updates immediately on click
  const serverCategoria = searchParams.get("categoria");
  const serverLinea = searchParams.get("linea");
  const [localCategoria, setLocalCategoria] = useState<string | null>(serverCategoria);
  const [localLinea, setLocalLinea] = useState<string | null>(serverLinea);

  // Sync local state when server confirms (searchParams change)
  useEffect(() => { setLocalCategoria(serverCategoria); }, [serverCategoria]);
  useEffect(() => { setLocalLinea(serverLinea); }, [serverLinea]);

  // Optimistic filter update
  function handleFilterUpdate(key: string, value: string | null) {
    if (key === "categoria") setLocalCategoria(value);
    if (key === "linea") setLocalLinea(value);
    updateFilter(key, value);
  }

  const activeCount = Array.from(searchParams.keys()).filter(
    (k) => k !== "orden" && k !== "page"
  ).length + (isPending ? 0 : 0); // keep reactive

  const currentCategoria = localCategoria;
  const currentLinea = localLinea;

  return (
    <aside className="space-y-5">
      {/* Header */}
      {!hideHeader && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="volanta">
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

          {/* Silk divider */}
          <SilkDivider />
        </>
      )}

      {/* Categorías — hierarchical */}
      {categorias.length > 0 && (
        <div className="animate-entrar-izq motion-reduce:animate-none">
          <SectionTitle>Categoría</SectionTitle>
          <div className="space-y-1">
            {categorias.map((parent) => (
              <CategoryGroup
                key={parent.id}
                parent={parent}
                currentCategoria={currentCategoria}
                onSelect={(slug) =>
                  handleFilterUpdate("categoria", currentCategoria === slug ? null : slug)
                }
              />
            ))}
          </div>
        </div>
      )}

      <SilkDivider />

      {/* Línea */}
      {filters.lineas.length > 0 && (
        <div className="animate-entrar-izq [animation-delay:100ms] motion-reduce:animate-none">
          <SectionTitle>Línea</SectionTitle>
          <div className="space-y-0.5">
            {filters.lineas.map((linea) => {
              const slug = slugify(linea);
              return (
                <FilterItem
                  key={linea}
                  label={linea}
                  active={currentLinea === slug}
                  onClick={() =>
                    handleFilterUpdate("linea", currentLinea === slug ? null : slug)
                  }
                />
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}

/* ── Category Group (parent + expandable children) ── */

function CategoryGroup({
  parent,
  currentCategoria,
  onSelect,
}: {
  parent: Categoria;
  currentCategoria: string | null;
  onSelect: (slug: string) => void;
}) {
  const hasChildren = parent.children && parent.children.length > 0;

  // Auto-expand if parent or any child is active
  const isParentActive = currentCategoria === parent.slug;
  const isChildActive = hasChildren
    ? parent.children!.some((c) => c.slug === currentCategoria)
    : false;
  const shouldBeOpen = isParentActive || isChildActive;

  // Arranca abierto: las subcategorías son el filtro que más se usa y tenerlas
  // a la vista al entrar evita un click extra por rubro. El usuario puede
  // contraer lo que no le interese.
  const [expanded, setExpanded] = useState(true);

  // Los hijos entran escalonados solo cuando se abre la sección, no en la
  // carga: la sección arranca abierta y animarla sería desplegar algo que ya
  // estaba así.
  const [animarHijos, setAnimarHijos] = useState(false);
  function alternar() {
    if (!expanded) setAnimarHijos(true);
    setExpanded(!expanded);
  }

  // Al pasar a estar activo, se abre. Se ajusta durante el render (patrón de
  // "estado derivado de props" de React) en vez de con un efecto: el efecto
  // encadenaba un render extra y, al depender de `expanded`, volvía a abrir la
  // sección apenas el usuario la cerraba.
  const [eraVisible, setEraVisible] = useState(shouldBeOpen);
  if (shouldBeOpen !== eraVisible) {
    setEraVisible(shouldBeOpen);
    if (shouldBeOpen && !expanded) {
      setAnimarHijos(true);
      setExpanded(true);
    }
  }

  return (
    <div className="group">
      {/* Parent category */}
      <div className="flex items-center">
        <button
          onClick={() => onSelect(parent.slug)}
          className={`flex-1 text-left text-sm py-1.5 px-2 rounded-md transition-all duration-200 cursor-pointer ${
            isParentActive
              ? "text-niebla font-semibold"
              : "text-lavanda-light hover:text-niebla"
          }`}
        >
          <span className="flex items-center gap-2">
            {/* Hollow Knight soul indicator */}
            <span
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                isParentActive
                  ? "bg-ambar shadow-[0_0_6px_rgba(212,168,83,0.6)]"
                  : isChildActive
                    ? "bg-purpura shadow-[0_0_4px_rgba(108,99,160,0.4)]"
                    : "bg-lavanda/20 group-hover:bg-lavanda/40"
              }`}
            />
            {parent.nombre}
          </span>
        </button>

        {hasChildren && (
          <button
            onClick={alternar}
            className="p-1 text-texto-3 hover:text-lavanda-light transition-colors cursor-pointer"
            aria-label={expanded ? "Contraer" : "Expandir"}
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-300 ${
                expanded ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && (
        // Grid de 0fr a 1fr: anima a altura automática sin medir nada con JS.
        <div
          className={`grid transition-[grid-template-rows,opacity] motion-reduce:transition-none ${
            expanded
              ? "grid-rows-[1fr] opacity-100 duration-[350ms] ease-out"
              : "grid-rows-[0fr] opacity-0 duration-[250ms] ease-in"
          }`}
        >
          <div className="overflow-hidden" inert={!expanded}>
            <div className="ml-3 pl-3 border-l border-linea">
              {parent.children!.map((child, i) => (
                <div
                  key={child.id}
                  className={expanded && animarHijos ? "animate-entrar-izq motion-reduce:animate-none" : ""}
                  style={expanded && animarHijos ? { animationDelay: `${100 + i * 40}ms`, animationDuration: "250ms" } : undefined}
                >
                  <FilterItem
                    label={child.nombre}
                    active={currentCategoria === child.slug}
                    onClick={() => onSelect(child.slug)}
                    isChild
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Filter Item (used for both línea and child categories) ── */

function FilterItem({
  label,
  active,
  onClick,
  isChild = false,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  isChild?: boolean;
}) {

  return (
    <button
      onClick={onClick}
      className={`w-full text-left py-1.5 px-2 rounded-md transition-all duration-200 flex items-center gap-2 group/item cursor-pointer ${
        isChild ? "text-xs" : "text-sm"
      } ${
        active
          ? "text-ambar font-medium bg-ambar/5"
          : "text-lavanda-light hover:text-niebla hover:bg-lavanda/5"
      }`}
    >
      {/* Soul dot with glow */}
      <span className="relative flex items-center justify-center w-4 h-4 shrink-0">
        <span
          className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 ${
            active
              ? "bg-ambar"
              : "bg-lavanda/15 group-hover/item:bg-lavanda/30"
          }`}
        />
        <span
          className={`absolute inset-0 rounded-full bg-ambar/20 ${
            active ? "brillo-activo" : "scale-0 opacity-0 transition-[transform,opacity] duration-200"
          }`}
        />
      </span>
      {label}
    </button>
  );
}

/* ── Silk Divider (Hollow Knight inspired) ── */

function SilkDivider() {
  return (
    <div className="h-px origin-left bg-gradient-to-r from-purpura/30 via-lavanda/10 to-transparent animate-trazo motion-reduce:animate-none" />
  );
}

/* ── Section Title ── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold text-texto-3 uppercase tracking-[0.15em] mb-2">
      {children}
    </h3>
  );
}

/* ── Mobile Filter Button + Drawer ── */

export function MobileFilterToggle({
  filters,
  categorias,
}: FilterSidebarProps) {
  const [open, setOpen] = useState(false);
  // Mientras corre la animación de salida el drawer sigue montado.
  const [cerrando, setCerrando] = useState(false);
  const searchParams = useSearchParams();

  const activeCount = Array.from(searchParams.keys()).filter(
    (k) => k !== "orden" && k !== "page"
  ).length;

  function terminarCierre() {
    setCerrando(false);
    setOpen(false);
  }

  function handleClose() {
    // Con "reducir movimiento" la animación no corre y onAnimationEnd nunca
    // llegaría: el drawer quedaría abierto para siempre.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      terminarCierre();
      return;
    }
    setCerrando(true);
    // Respaldo por si animationend no llega (pestaña oculta, animación
    // cancelada): el drawer no puede quedar montado tapando la página. Dura un
    // poco más que drawer-out (0,3 s); cerrar dos veces no hace nada.
    window.setTimeout(terminarCierre, 320);
  }

  function alTerminarAnimacion(e: React.AnimationEvent<HTMLDivElement>) {
    // Las animaciones de los filtros de adentro también burbujean hasta acá.
    if (e.target !== e.currentTarget || !cerrando) return;
    terminarCierre();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden flex items-center gap-2 px-4 py-2 bg-navy-deep border border-linea rounded-lg text-sm text-lavanda-light hover:border-purpura/40 transition-colors"
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

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className={`absolute inset-0 bg-black/60 ${cerrando ? "animate-overlay-out" : "animate-overlay-in"} motion-reduce:animate-none`}
            onClick={handleClose}
          />
          <div
            onAnimationEnd={alTerminarAnimacion}
            className={`absolute bottom-0 left-0 right-0 bg-navy rounded-t-2xl p-6 max-h-[75vh] overflow-y-auto ${
              cerrando ? "animate-drawer-out" : "animate-drawer-in"
            } motion-reduce:animate-none`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-texto">
                Filtros
              </h2>
              <button
                onClick={handleClose}
                className="text-texto-3 hover:text-niebla transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <FilterSidebar filters={filters} categorias={categorias} hideHeader />
          </div>
        </div>
      )}
    </>
  );
}
