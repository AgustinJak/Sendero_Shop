"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useState, useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { useFilterTransition } from "./FilterTransitionContext";
import type { AvailableFilters } from "@/lib/queries";
import type { Categoria } from "@/types";
import { slugify } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

interface FilterSidebarProps {
  filters: AvailableFilters;
  categorias?: Categoria[];
  hideHeader?: boolean;
}

export default function FilterSidebar({ filters, categorias = [], hideHeader = false }: FilterSidebarProps) {
  const { updateFilter, clearAll, isPending } = useFilterTransition();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Stagger entrance animation
  useGSAP(() => {
    if (!containerRef.current) return;
    const sections = containerRef.current.querySelectorAll("[data-filter-section]");
    gsap.fromTo(
      sections,
      { opacity: 0, x: -12 },
      { opacity: 1, x: 0, duration: 0.4, stagger: 0.1, ease: "power2.out" }
    );
  }, { scope: containerRef });

  return (
    <aside ref={containerRef} className="space-y-5">
      {/* Header */}
      {!hideHeader && (
        <>
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

          {/* Silk divider */}
          <SilkDivider />
        </>
      )}

      {/* Categorías — hierarchical */}
      {categorias.length > 0 && (
        <div data-filter-section>
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
        <div data-filter-section>
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
  const childrenRef = useRef<HTMLDivElement>(null);

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

  // Al pasar a estar activo, se abre. Se ajusta durante el render (patrón de
  // "estado derivado de props" de React) en vez de con un efecto: el efecto
  // encadenaba un render extra y, al depender de `expanded`, volvía a abrir la
  // sección apenas el usuario la cerraba.
  const [eraVisible, setEraVisible] = useState(shouldBeOpen);
  if (shouldBeOpen !== eraVisible) {
    setEraVisible(shouldBeOpen);
    if (shouldBeOpen) setExpanded(true);
  }

  // Animate children expand/collapse
  const primerRender = useRef(true);
  useEffect(() => {
    if (!childrenRef.current || !hasChildren) return;
    // En el primer render el estilo inline ya deja la sección abierta; animarla
    // sería desplegar algo que se supone que ya estaba así.
    if (primerRender.current) {
      primerRender.current = false;
      return;
    }
    if (expanded) {
      gsap.fromTo(
        childrenRef.current,
        { height: 0, opacity: 0 },
        { height: "auto", opacity: 1, duration: 0.35, ease: "power2.out" }
      );
      // Stagger child items
      const items = childrenRef.current.querySelectorAll("[data-child-item]");
      gsap.fromTo(
        items,
        { opacity: 0, x: -8 },
        { opacity: 1, x: 0, duration: 0.25, stagger: 0.04, delay: 0.1, ease: "power2.out" }
      );
    } else {
      gsap.to(childrenRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.25,
        ease: "power2.in",
      });
    }
  }, [expanded, hasChildren]);

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
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-lavanda/60 hover:text-lavanda-light transition-colors cursor-pointer"
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
        <div ref={childrenRef} className="overflow-hidden" style={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}>
          <div className="ml-3 pl-3 border-l border-lavanda/10">
            {parent.children!.map((child) => (
              <div key={child.id} data-child-item>
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
  const itemRef = useRef<HTMLButtonElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);

  // GSAP glow pulse on active
  useEffect(() => {
    if (!glowRef.current) return;
    if (active) {
      gsap.fromTo(
        glowRef.current,
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.3, ease: "back.out(2)" }
      );
      // Subtle continuous pulse
      gsap.to(glowRef.current, {
        boxShadow: "0 0 8px rgba(212,168,83,0.5)",
        repeat: -1,
        yoyo: true,
        duration: 1.5,
        ease: "sine.inOut",
      });
    } else {
      gsap.killTweensOf(glowRef.current);
      gsap.to(glowRef.current, { scale: 0, opacity: 0, duration: 0.2 });
    }
  }, [active]);

  return (
    <button
      ref={itemRef}
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
          ref={glowRef}
          className="absolute inset-0 rounded-full bg-ambar/20"
          style={{ transform: "scale(0)", opacity: 0 }}
        />
      </span>
      {label}
    </button>
  );
}

/* ── Silk Divider (Hollow Knight inspired) ── */

function SilkDivider() {
  const lineRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!lineRef.current) return;
    gsap.fromTo(
      lineRef.current,
      { scaleX: 0, transformOrigin: "left center" },
      { scaleX: 1, duration: 0.6, ease: "power2.out", delay: 0.2 }
    );
  }, { scope: lineRef });

  return (
    <div ref={lineRef} className="h-px bg-gradient-to-r from-purpura/30 via-lavanda/10 to-transparent" />
  );
}

/* ── Section Title ── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-semibold text-lavanda/60 uppercase tracking-[0.15em] mb-2 font-[family-name:var(--font-cinzel)]">
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
  const searchParams = useSearchParams();
  const overlayRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const activeCount = Array.from(searchParams.keys()).filter(
    (k) => k !== "orden" && k !== "page"
  ).length;

  // Animate drawer open/close
  useEffect(() => {
    if (!overlayRef.current || !drawerRef.current) return;
    if (open) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      gsap.fromTo(
        drawerRef.current,
        { y: "100%" },
        { y: "0%", duration: 0.4, ease: "power3.out" }
      );
    }
  }, [open]);

  const handleClose = useCallback(() => {
    if (!overlayRef.current || !drawerRef.current) return;
    gsap.to(overlayRef.current, { opacity: 0, duration: 0.2 });
    gsap.to(drawerRef.current, {
      y: "100%",
      duration: 0.3,
      ease: "power3.in",
      onComplete: () => setOpen(false),
    });
  }, []);

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

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            ref={overlayRef}
            className="absolute inset-0 bg-black/60"
            onClick={handleClose}
          />
          <div
            ref={drawerRef}
            className="absolute bottom-0 left-0 right-0 bg-navy rounded-t-2xl p-6 max-h-[75vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla">
                Filtros
              </h2>
              <button
                onClick={handleClose}
                className="text-lavanda/75 hover:text-niebla transition-colors p-1"
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
