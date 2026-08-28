"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import type { EnvioSybZona } from "@/types";

/**
 * Edición de zonas y precios del courier local.
 *
 * Vive en el admin y no en el código porque el courier actualiza precios
 * seguido, y porque las zonas se cargaron leyendo el mapa a ojo: acá se
 * corrigen sin esperar un deploy.
 *
 * Cada zona lista nombres de partido Y de localidad. El checkout compara
 * primero contra el municipio que devuelve georef y, si no hay match, contra
 * la localidad que escribió el cliente. Ver lib/envio-syb.ts.
 */
export default function SybZonasManager({ zonas: inicial }: { zonas: EnvioSybZona[] }) {
  const router = useRouter();
  const [zonas, setZonas] = useState(inicial);
  const [loading, setLoading] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");

  function actualizar(id: string, campo: keyof EnvioSybZona, valor: unknown) {
    setZonas((prev) => prev.map((z) => (z.id === id ? { ...z, [campo]: valor } : z)));
    setGuardado(false);
  }

  async function guardar() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/envio-syb", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zonas }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar");
      setGuardado(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-yellow-400/25 bg-yellow-400/10 p-4">
        <p className="text-sm font-semibold text-yellow-400">
          Revisá las zonas antes de usarlo
        </p>
        <p className="mt-1 text-xs text-texto-2">
          La carga inicial salió de leer el mapa del courier, así que puede tener
          partidos en la zona equivocada. Un error acá se traduce en cobrar mal
          el envío. Confirmá cada lista contra lo que te pasó SyB.
        </p>
      </div>

      {zonas.map((z) => (
        <div key={z.id} className="space-y-3 rounded-xl border border-linea bg-navy p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px] flex-1">
              <label className="mb-1 block text-xs text-texto-3">Nombre</label>
              <input
                value={z.nombre}
                onChange={(e) => actualizar(z.id, "nombre", e.target.value)}
                className="w-full rounded-lg border border-linea bg-navy-deep px-3 py-2 text-sm text-texto focus:border-purpura focus:outline-none"
              />
            </div>
            <div className="w-32">
              <label className="mb-1 block text-xs text-texto-3">Precio</label>
              <input
                type="number"
                min={0}
                value={z.precio}
                onChange={(e) => actualizar(z.id, "precio", Number(e.target.value))}
                className="w-full rounded-lg border border-linea bg-navy-deep px-3 py-2 text-sm text-texto focus:border-purpura focus:outline-none"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-xs text-texto-2">
              <input
                type="checkbox"
                checked={z.activo}
                onChange={(e) => actualizar(z.id, "activo", e.target.checked)}
                className="accent-purpura"
              />
              Activa
            </label>
            <span className="pb-2 text-xs text-texto-3">{formatPrice(z.precio)}</span>
          </div>

          <div>
            <label className="mb-1 block text-xs text-texto-3">Códigos postales</label>
            <input
              value={z.codigos_postales || ""}
              onChange={(e) => actualizar(z.id, "codigos_postales", e.target.value)}
              placeholder="Ej: 1000-1499, 1602, 1636"
              className="w-full rounded-lg border border-linea bg-navy-deep px-3 py-2 font-mono text-xs text-texto placeholder:text-texto-3 focus:border-purpura focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-texto-3">
              Rangos y CPs sueltos separados por coma. Solo se usan en el
              calculador de la ficha de producto, donde no hay dirección todavía.
              Si lo dejás vacío, la zona sigue funcionando en el checkout pero no
              aparece al calcular por código postal.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-texto-3">
              Partidos y localidades ({z.zonas.length}) — uno por línea
            </label>
            <textarea
              rows={Math.min(12, Math.max(4, z.zonas.length))}
              value={z.zonas.join("\n")}
              onChange={(e) =>
                actualizar(
                  z.id,
                  "zonas",
                  e.target.value
                    .split("\n")
                    .map((l) => l.trim())
                    .filter(Boolean)
                )
              }
              className="w-full resize-y rounded-lg border border-linea bg-navy-deep px-3 py-2 font-mono text-xs text-texto focus:border-purpura focus:outline-none"
            />
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          onClick={guardar}
          disabled={loading}
          className="rounded-lg bg-purpura px-6 py-2 text-sm font-semibold text-niebla transition-colors hover:bg-purpura/80 disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Guardar zonas"}
        </button>
        {guardado && <span className="text-sm text-emerald-400">Guardado</span>}
      </div>
    </div>
  );
}
