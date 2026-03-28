"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { VarianteGrupo } from "@/types";

interface OpcionLocal {
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

interface Props {
  productoId: string;
  grupos: VarianteGrupo[];
}

function toLocal(grupos: VarianteGrupo[]): GrupoLocal[] {
  return grupos
    .sort((a, b) => a.orden - b.orden)
    .map((g) => ({
      id: g.id,
      nombre: g.nombre,
      orden: g.orden,
      opciones: (g.opciones || [])
        .sort((a, b) => a.orden - b.orden)
        .map((o) => ({
          id: o.id,
          valor: o.valor,
          precio_adicional: o.precio_adicional,
          imagen_url: o.imagen_url,
          activo: o.activo,
          orden: o.orden,
        })),
    }));
}

export default function VariantesManager({ productoId, grupos: initialGrupos }: Props) {
  const router = useRouter();
  const [grupos, setGrupos] = useState<GrupoLocal[]>(toLocal(initialGrupos));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function addGrupo() {
    setGrupos((prev) => [
      ...prev,
      { nombre: "", orden: prev.length, opciones: [] },
    ]);
  }

  function removeGrupo(idx: number) {
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
            valor: o.valor,
            precio_adicional: Number(o.precio_adicional) || 0,
            imagen_url: o.imagen_url,
            activo: o.activo,
            orden: oi,
          })),
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
              <div key={oi} className="flex items-center gap-2">
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
                    value={op.precio_adicional}
                    onChange={(e) =>
                      updateOpcion(
                        gi,
                        oi,
                        "precio_adicional",
                        Number(e.target.value)
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
