"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VarianteGrupo, VariantePrecioRegla } from "@/types";
import { formatPrice } from "@/lib/utils";

interface OpcionLocal {
  temp_key: string; // clave única para mapear reglas
  id?: string;
  valor: string;
  precio_adicional: number;
  imagen_url: string | null;
  activo: boolean;
  orden: number;
}

interface GrupoLocal {
  id?: string;
  nombre: string;
  orden: number;
  opciones: OpcionLocal[];
}

interface ReglaLocal {
  opcion_key: string;
  cuando_opcion_key: string;
  precio_adicional: number;
}

interface Props {
  productoId: string;
  grupos: VarianteGrupo[];
  precioReglas?: VariantePrecioRegla[];
}

let keyCounter = 0;
function genKey() {
  return `k_${Date.now()}_${keyCounter++}`;
}

// Map real IDs to temp keys for existing data
function toLocal(
  grupos: VarianteGrupo[],
  reglas: VariantePrecioRegla[]
): { grupos: GrupoLocal[]; reglas: ReglaLocal[]; idToKey: Record<string, string> } {
  const idToKey: Record<string, string> = {};

  const gruposLocal = grupos
    .sort((a, b) => a.orden - b.orden)
    .map((g) => ({
      id: g.id,
      nombre: g.nombre,
      orden: g.orden,
      opciones: (g.opciones || [])
        .sort((a, b) => a.orden - b.orden)
        .map((o) => {
          const key = genKey();
          idToKey[o.id] = key;
          return {
            temp_key: key,
            id: o.id,
            valor: o.valor,
            precio_adicional: o.precio_adicional,
            imagen_url: o.imagen_url,
            activo: o.activo,
            orden: o.orden,
          };
        }),
    }));

  const reglasLocal = reglas
    .filter((r) => idToKey[r.opcion_id] && idToKey[r.cuando_opcion_id])
    .map((r) => ({
      opcion_key: idToKey[r.opcion_id],
      cuando_opcion_key: idToKey[r.cuando_opcion_id],
      precio_adicional: Number(r.precio_adicional),
    }));

  return { grupos: gruposLocal, reglas: reglasLocal, idToKey };
}

export default function VariantesManager({ productoId, grupos: initialGrupos, precioReglas: initialReglas = [] }: Props) {
  const router = useRouter();
  const initial = toLocal(initialGrupos, initialReglas);
  const [grupos, setGrupos] = useState<GrupoLocal[]>(initial.grupos);
  const [reglas, setReglas] = useState<ReglaLocal[]>(initial.reglas);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showReglas, setShowReglas] = useState(initial.reglas.length > 0);

  // Flat list of all options for rule dropdowns
  const allOpciones = grupos.flatMap((g) =>
    g.opciones.map((o) => ({
      key: o.temp_key,
      label: `${g.nombre}: ${o.valor}`,
      grupoNombre: g.nombre,
      valor: o.valor,
    }))
  );

  function addGrupo() {
    setGrupos((prev) => [
      ...prev,
      { nombre: "", orden: prev.length, opciones: [] },
    ]);
  }

  function removeGrupo(idx: number) {
    const grupo = grupos[idx];
    const opcionKeys = grupo.opciones.map((o) => o.temp_key);
    // Remove reglas referencing these options
    setReglas((prev) =>
      prev.filter(
        (r) => !opcionKeys.includes(r.opcion_key) && !opcionKeys.includes(r.cuando_opcion_key)
      )
    );
    setGrupos((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateGrupo(idx: number, field: string, value: string) {
    setGrupos((prev) =>
      prev.map((g, i) => (i === idx ? { ...g, [field]: value } : g))
    );
  }

  function addOpcion(grupoIdx: number) {
    setGrupos((prev) =>
      prev.map((g, i) =>
        i === grupoIdx
          ? {
              ...g,
              opciones: [
                ...g.opciones,
                {
                  temp_key: genKey(),
                  valor: "",
                  precio_adicional: 0,
                  imagen_url: null,
                  activo: true,
                  orden: g.opciones.length,
                },
              ],
            }
          : g
      )
    );
  }

  function removeOpcion(grupoIdx: number, opIdx: number) {
    const opKey = grupos[grupoIdx].opciones[opIdx].temp_key;
    setReglas((prev) =>
      prev.filter((r) => r.opcion_key !== opKey && r.cuando_opcion_key !== opKey)
    );
    setGrupos((prev) =>
      prev.map((g, i) =>
        i === grupoIdx
          ? { ...g, opciones: g.opciones.filter((_, j) => j !== opIdx) }
          : g
      )
    );
  }

  function updateOpcion(
    grupoIdx: number,
    opIdx: number,
    field: string,
    value: string | number | boolean
  ) {
    setGrupos((prev) =>
      prev.map((g, gi) =>
        gi === grupoIdx
          ? {
              ...g,
              opciones: g.opciones.map((o, oi) =>
                oi === opIdx ? { ...o, [field]: value } : o
              ),
            }
          : g
      )
    );
  }

  function addRegla() {
    if (allOpciones.length < 2) return;
    setReglas((prev) => [
      ...prev,
      { opcion_key: "", cuando_opcion_key: "", precio_adicional: 0 },
    ]);
  }

  function updateRegla(idx: number, field: string, value: string | number) {
    setReglas((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  }

  function removeRegla(idx: number) {
    setReglas((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setError("");
    setSuccess(false);
    setSaving(true);

    try {
      const payload = {
        grupos: grupos.map((g, gi) => ({
          nombre: g.nombre,
          orden: gi,
          opciones: g.opciones.map((o, oi) => ({
            temp_key: o.temp_key,
            valor: o.valor,
            precio_adicional: Number(o.precio_adicional) || 0,
            imagen_url: o.imagen_url,
            activo: o.activo,
            orden: oi,
          })),
        })),
        reglas: reglas
          .filter((r) => r.opcion_key && r.cuando_opcion_key)
          .map((r) => ({
            opcion_key: r.opcion_key,
            cuando_opcion_key: r.cuando_opcion_key,
            precio_adicional: Number(r.precio_adicional) || 0,
          })),
      };

      const res = await fetch(`/api/admin/productos/${productoId}/variantes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar variantes");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider">
          Variantes
        </h3>
        <button
          type="button"
          onClick={addGrupo}
          className="text-xs px-3 py-1.5 bg-purpura/10 border border-purpura/30 text-purpura hover:bg-purpura/20 rounded-lg transition-colors"
        >
          + Grupo
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-red-400 text-xs">
          {error}
        </div>
      )}

      {grupos.length === 0 && (
        <p className="text-lavanda/40 text-xs text-center py-4">
          Sin variantes. Agregá un grupo (ej: Color, Tamaño, Con/Sin funda).
        </p>
      )}

      {grupos.map((grupo, gi) => (
        <div
          key={gi}
          className="bg-navy-deep border border-lavanda/10 rounded-xl p-4 space-y-3"
        >
          {/* Group header */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={grupo.nombre}
              onChange={(e) => updateGrupo(gi, "nombre", e.target.value)}
              placeholder="Nombre del grupo (ej: Color)"
              className="flex-1 px-3 py-1.5 bg-navy border border-lavanda/20 rounded-lg text-sm text-niebla focus:outline-none focus:border-purpura"
            />
            <button
              type="button"
              onClick={() => removeGrupo(gi)}
              className="text-xs px-2 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Eliminar grupo"
            >
              Eliminar
            </button>
          </div>

          {/* Options */}
          <div className="space-y-2 ml-2">
            {grupo.opciones.map((op, oi) => (
              <div key={op.temp_key} className="flex items-center gap-2">
                <input
                  type="text"
                  value={op.valor}
                  onChange={(e) =>
                    updateOpcion(gi, oi, "valor", e.target.value)
                  }
                  placeholder="Valor (ej: Rojo)"
                  className="flex-1 px-2 py-1.5 bg-navy border border-lavanda/15 rounded-lg text-xs text-lavanda-light focus:outline-none focus:border-purpura"
                />
                <div className="flex items-center gap-1">
                  <span className="text-xs text-lavanda/40">+$</span>
                  <input
                    type="number"
                    value={op.precio_adicional || ""}
                    onChange={(e) =>
                      updateOpcion(
                        gi,
                        oi,
                        "precio_adicional",
                        Number(e.target.value) || 0
                      )
                    }
                    min={0}
                    step={1}
                    className="w-20 px-2 py-1.5 bg-navy border border-lavanda/15 rounded-lg text-xs text-lavanda-light focus:outline-none focus:border-purpura"
                  />
                </div>
                <label className="flex items-center gap-1 cursor-pointer" title="Activo">
                  <input
                    type="checkbox"
                    checked={op.activo}
                    onChange={(e) =>
                      updateOpcion(gi, oi, "activo", e.target.checked)
                    }
                    className="accent-purpura w-3.5 h-3.5"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeOpcion(gi, oi)}
                  className="text-red-400/60 hover:text-red-400 text-xs transition-colors px-1"
                  title="Quitar opción"
                >
                  ×
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addOpcion(gi)}
              className="text-xs text-purpura/70 hover:text-purpura transition-colors"
            >
              + Opción
            </button>
          </div>
        </div>
      ))}

      {/* Precio reglas section */}
      {grupos.length >= 2 && (
        <div className="border-t border-lavanda/10 pt-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setShowReglas(!showReglas)}
              className="text-xs text-lavanda-light hover:text-niebla transition-colors flex items-center gap-1"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`w-3 h-3 transition-transform ${showReglas ? "rotate-90" : ""}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
              Precios condicionales
              {reglas.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-ambar/10 text-ambar ml-1">
                  {reglas.length}
                </span>
              )}
            </button>
          </div>

          {showReglas && (
            <div className="space-y-3">
              <p className="text-xs text-lavanda/40">
                Definí precios distintos para una opción según qué otra opción esté seleccionada. El precio base de la opción se usa cuando no hay regla.
              </p>

              {reglas.map((regla, ri) => {
                // "cuando" = la condición (ej: Tamaño: 95cm)
                const cuandoInfo = allOpciones.find((o) => o.key === regla.cuando_opcion_key);
                // "entonces" = opciones de OTROS grupos (ej: Funda: Con funda)
                const opcionesEntonces = allOpciones.filter(
                  (o) => !cuandoInfo || o.grupoNombre !== cuandoInfo.grupoNombre
                );

                return (
                  <div key={ri} className="bg-navy-deep border border-lavanda/10 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-lavanda/50 whitespace-nowrap">Cuando</span>
                      <select
                        value={regla.cuando_opcion_key}
                        onChange={(e) => {
                          updateRegla(ri, "cuando_opcion_key", e.target.value);
                          // Reset opcion_key si pertenece al mismo grupo que la nueva condición
                          const newCuando = allOpciones.find((o) => o.key === e.target.value);
                          const currentOpcion = allOpciones.find((o) => o.key === regla.opcion_key);
                          if (newCuando && currentOpcion && newCuando.grupoNombre === currentOpcion.grupoNombre) {
                            updateRegla(ri, "opcion_key", "");
                          }
                        }}
                        className="flex-1 px-2 py-1.5 bg-navy border border-lavanda/15 rounded-lg text-xs text-lavanda-light focus:outline-none focus:border-purpura"
                      >
                        <option value="">Seleccionar condición...</option>
                        {allOpciones.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-lavanda/50 whitespace-nowrap">entonces</span>
                      <select
                        value={regla.opcion_key}
                        onChange={(e) => updateRegla(ri, "opcion_key", e.target.value)}
                        className="flex-1 px-2 py-1.5 bg-navy border border-lavanda/15 rounded-lg text-xs text-lavanda-light focus:outline-none focus:border-purpura"
                      >
                        <option value="">Seleccionar opción...</option>
                        {opcionesEntonces.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-lavanda/50">cuesta +$</span>
                      <input
                        type="number"
                        value={regla.precio_adicional || ""}
                        onChange={(e) => updateRegla(ri, "precio_adicional", Number(e.target.value) || 0)}
                        min={0}
                        step={1}
                        className="w-24 px-2 py-1.5 bg-navy border border-lavanda/15 rounded-lg text-xs text-lavanda-light focus:outline-none focus:border-purpura"
                      />
                      <button
                        type="button"
                        onClick={() => removeRegla(ri)}
                        className="text-red-400/60 hover:text-red-400 transition-colors px-1"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addRegla}
                disabled={allOpciones.length < 2}
                className="text-xs text-purpura/70 hover:text-purpura transition-colors disabled:opacity-30"
              >
                + Agregar regla de precio
              </button>
            </div>
          )}
        </div>
      )}

      {/* Save button */}
      {grupos.length > 0 && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-2 text-sm font-medium rounded-lg transition-colors ${
            success
              ? "bg-green-500/20 border border-green-500/30 text-green-400"
              : "bg-purpura hover:bg-purpura/80 text-niebla disabled:opacity-50"
          }`}
        >
          {saving
            ? "Guardando..."
            : success
              ? "Guardado"
              : "Guardar variantes"}
        </button>
      )}
    </div>
  );
}
