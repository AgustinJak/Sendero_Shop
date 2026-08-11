"use client";

import { useSearchParams, useRouter } from "next/navigation";


export default function ActiveFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const categoria = searchParams.get("categoria");
  const linea = searchParams.get("linea");
  const busqueda = searchParams.get("q");

  const filters = [
    categoria && { key: "categoria", label: `Categoría: ${categoria}` },
    linea && { key: "linea", label: `Línea: ${linea}` },
    busqueda && { key: "q", label: `Búsqueda: "${busqueda}"` },
  ].filter(Boolean) as { key: string; label: string }[];

  if (filters.length === 0) return null;

  function removeFilter(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.delete("page");
    const qs = params.toString();
    router.push(`/catalogo${qs ? `?${qs}` : ""}`);
  }

  function clearAll() {
    router.push("/catalogo");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {/* Sin AnimatePresence: el chip que salía quedaba en el DOM ocupando
          lugar y, al ser invisible pero clickeable, borraba un filtro si se
          hacía click en lo que parecía espacio vacío. */}
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => removeFilter(f.key)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purpura/20 border border-purpura/30 text-sm text-lavanda-light rounded-full hover:bg-purpura/30 transition-colors cursor-pointer animate-fade-in"
        >
          {f.label}
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      ))}

      {filters.length > 1 && (
        <button
          onClick={clearAll}
          className="text-xs text-ambar hover:text-ambar-light transition-colors ml-1 cursor-pointer"
        >
          Limpiar todo
        </button>
      )}
    </div>
  );
}
