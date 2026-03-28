"use client";

import type { VarianteGrupo, VarianteSeleccion } from "@/types";
import { formatPrice } from "@/lib/utils";

interface VariantSelectorProps {
  grupos: VarianteGrupo[];
  selecciones: VarianteSeleccion[];
  onChange: (selecciones: VarianteSeleccion[]) => void;
}

export default function VariantSelector({
  grupos,
  selecciones,
  onChange,
}: VariantSelectorProps) {
  if (!grupos || grupos.length === 0) return null;

  const sorted = [...grupos].sort((a, b) => a.orden - b.orden);

  function handleSelect(grupo: VarianteGrupo, opcionId: string) {
    const opcion = grupo.opciones?.find((o) => o.id === opcionId);
    if (!opcion) return;

    const newSelecciones = selecciones.filter(
      (s) => s.grupo_id !== grupo.id
    );
    newSelecciones.push({
      grupo_id: grupo.id,
      grupo_nombre: grupo.nombre,
      opcion_id: opcion.id,
      opcion_valor: opcion.valor,
      precio_adicional: opcion.precio_adicional,
    });
    onChange(newSelecciones);
  }

  return (
    <div className="space-y-4">
      {sorted.map((grupo) => {
        const opciones = grupo.opciones
          ?.filter((o) => o.activo)
          .sort((a, b) => a.orden - b.orden) || [];
        const selectedId = selecciones.find(
          (s) => s.grupo_id === grupo.id
        )?.opcion_id;

        return (
          <div key={grupo.id}>
            <label className="block text-sm font-medium text-lavanda-light mb-2">
              {grupo.nombre}
            </label>
            <div className="flex flex-wrap gap-2">
              {opciones.map((opcion) => (
                <button
                  key={opcion.id}
                  onClick={() => handleSelect(grupo, opcion.id)}
                  className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                    selectedId === opcion.id
                      ? "border-purpura bg-purpura/20 text-niebla"
                      : "border-lavanda/20 text-lavanda-light hover:border-lavanda/40"
                  }`}
                >
                  {opcion.valor}
                  {opcion.precio_adicional > 0 && (
                    <span className="ml-1 text-xs text-lavanda/60">
                      +{formatPrice(opcion.precio_adicional)}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
