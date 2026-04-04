"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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
      <AnimatePresence>
        {filters.map((f) => (
          <motion.button
            key={f.key}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => removeFilter(f.key)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purpura/20 border border-purpura/30 text-sm text-lavanda-light rounded-full hover:bg-purpura/30 transition-colors cursor-pointer"
          >
            {f.label}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>
        ))}
      </AnimatePresence>

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
