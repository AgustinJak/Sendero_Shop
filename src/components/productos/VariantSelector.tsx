"use client";

import type { VarianteGrupo, VarianteSeleccion, VariantePrecioRegla } from "@/types";
import { formatPrice } from "@/lib/utils";

interface VariantSelectorProps {
  grupos: VarianteGrupo[];
  selecciones: VarianteSeleccion[];
  onChange: (selecciones: VarianteSeleccion[]) => void;
  precioReglas?: VariantePrecioRegla[];
}

/**
 * Dado una opción y las selecciones actuales de otros grupos,
 * busca si hay una regla de precio condicional que aplique.
 * Si la hay, usa ese precio. Si no, usa el precio_adicional base.
 */
function getPrecioEfectivo(
  opcionId: string,
  precioBase: number,
  selecciones: VarianteSeleccion[],
  reglas: VariantePrecioRegla[]
): number {
  // Buscar reglas para esta opción
  const reglasOpcion = reglas.filter((r) => r.opcion_id === opcionId);
  if (reglasOpcion.length === 0) return precioBase;

  // Ver si alguna de las opciones seleccionadas activa una regla
  const seleccionIds = selecciones.map((s) => s.opcion_id);
  const reglaActiva = reglasOpcion.find((r) =>
    seleccionIds.includes(r.cuando_opcion_id)
  );

  return reglaActiva ? Number(reglaActiva.precio_adicional) : precioBase;
}

export default function VariantSelector({
  grupos,
  selecciones,
  onChange,
  precioReglas = [],
}: VariantSelectorProps) {
  if (!grupos || grupos.length === 0) return null;

  const sorted = [...grupos].sort((a, b) => a.orden - b.orden);

  function handleSelect(grupo: VarianteGrupo, opcionId: string) {
    const opcion = grupo.opciones?.find((o) => o.id === opcionId);
    if (!opcion) return;

    // Calcular precio efectivo según reglas y selecciones de otros grupos
    const otrasSelecciones = selecciones.filter((s) => s.grupo_id !== grupo.id);
    const precioEfectivo = getPrecioEfectivo(
      opcion.id,
      opcion.precio_adicional,
      otrasSelecciones,
      precioReglas
    );

    const newSelecciones = [...otrasSelecciones];
    newSelecciones.push({
      grupo_id: grupo.id,
      grupo_nombre: grupo.nombre,
      opcion_id: opcion.id,
      opcion_valor: opcion.valor,
      precio_adicional: precioEfectivo,
    });

    // Recalcular precios de las otras selecciones también (pueden cambiar con esta nueva selección)
    const finalSelecciones = newSelecciones.map((sel) => {
      if (sel.grupo_id === grupo.id) return sel; // ya calculado
      const otroGrupo = grupos.find((g) => g.id === sel.grupo_id);
      const otraOpcion = otroGrupo?.opciones?.find((o) => o.id === sel.opcion_id);
      if (!otraOpcion) return sel;

      const otrasParaEste = newSelecciones.filter((s) => s.grupo_id !== sel.grupo_id);
      const nuevoPrecio = getPrecioEfectivo(
        otraOpcion.id,
        otraOpcion.precio_adicional,
        otrasParaEste,
        precioReglas
      );

      return { ...sel, precio_adicional: nuevoPrecio };
    });

    onChange(finalSelecciones);
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

        // Selecciones de otros grupos para calcular precios mostrados
        const otrasSelecciones = selecciones.filter((s) => s.grupo_id !== grupo.id);

        return (
          <div key={grupo.id}>
            <label className="block text-sm font-medium text-lavanda-light mb-2">
              {grupo.nombre}
            </label>
            <div className="flex flex-wrap gap-2">
              {opciones.map((opcion) => {
                const precioMostrado = getPrecioEfectivo(
                  opcion.id,
                  opcion.precio_adicional,
                  otrasSelecciones,
                  precioReglas
                );

                return (
                  <button
                    key={opcion.id}
                    onClick={() => handleSelect(grupo, opcion.id)}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors cursor-pointer ${
                      selectedId === opcion.id
                        ? "border-purpura bg-purpura/20 text-niebla"
                        : "border-lavanda/20 text-lavanda-light hover:border-lavanda/40"
                    }`}
                  >
                    {opcion.valor}
                    {precioMostrado > 0 && (
                      <span className="ml-1 text-xs text-lavanda/75">
                        +{formatPrice(precioMostrado)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
