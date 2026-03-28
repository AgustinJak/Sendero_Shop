"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Banner } from "@/types";

type BannerForm = {
  titulo: string;
  subtitulo: string;
  imagen_url: string;
  link: string;
  posicion: Banner["posicion"];
  activo: boolean;
  fecha_inicio: string;
  fecha_fin: string;
  orden: number;
};

const EMPTY_FORM: BannerForm = {
  titulo: "",
  subtitulo: "",
  imagen_url: "",
  link: "",
  posicion: "hero",
  activo: true,
  fecha_inicio: "",
  fecha_fin: "",
  orden: 0,
};

const POSICIONES: { value: Banner["posicion"]; label: string }[] = [
  { value: "hero", label: "Hero (Home)" },
  { value: "catalogo_top", label: "Catálogo (arriba)" },
  { value: "popup", label: "Popup" },
];

export default function BannersManager({ banners }: { banners: Banner[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);

  function openNew() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(b: Banner) {
    setForm({
      titulo: b.titulo || "",
      subtitulo: b.subtitulo || "",
      imagen_url: b.imagen_url || "",
      link: b.link || "",
      posicion: b.posicion,
      activo: b.activo,
      fecha_inicio: b.fecha_inicio?.slice(0, 10) || "",
      fecha_fin: b.fecha_fin?.slice(0, 10) || "",
      orden: b.orden,
    });
    setEditing(b.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const body = {
      titulo: form.titulo || null,
      subtitulo: form.subtitulo || null,
      imagen_url: form.imagen_url || null,
      link: form.link || null,
      posicion: form.posicion,
      activo: form.activo,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
      orden: form.orden,
    };

    const url = editing ? `/api/admin/banners/${editing}` : "/api/admin/banners";
    await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);
    setShowForm(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este banner?")) return;
    await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function toggleActivo(b: Banner) {
    await fetch(`/api/admin/banners/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !b.activo }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <button
        onClick={openNew}
        className="px-4 py-2 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-medium rounded-lg transition-colors"
      >
        + Nuevo banner
      </button>

      {/* List */}
      <div className="space-y-3">
        {banners.map((b) => (
          <div
            key={b.id}
            className="bg-navy-deep border border-lavanda/10 rounded-xl p-4 flex items-center gap-4"
          >
            {b.imagen_url && (
              <img
                src={b.imagen_url}
                alt={b.titulo || "Banner"}
                className="w-24 h-14 object-cover rounded-lg"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-niebla font-medium truncate">
                  {b.titulo || "(Sin título)"}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-lavanda/10 text-lavanda/60">
                  {POSICIONES.find((p) => p.value === b.posicion)?.label}
                </span>
                {!b.activo && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                    inactivo
                  </span>
                )}
              </div>
              <p className="text-sm text-lavanda/50 truncate mt-0.5">
                {b.subtitulo || "—"}
                {b.fecha_inicio || b.fecha_fin
                  ? ` · ${b.fecha_inicio?.slice(0, 10) || "∞"} → ${b.fecha_fin?.slice(0, 10) || "∞"}`
                  : ""}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => toggleActivo(b)}
                className="text-xs px-3 py-1 border border-lavanda/20 rounded-lg text-lavanda-light hover:bg-lavanda/10 transition-colors"
              >
                {b.activo ? "Desactivar" : "Activar"}
              </button>
              <button
                onClick={() => openEdit(b)}
                className="text-xs px-3 py-1 border border-lavanda/20 rounded-lg text-lavanda-light hover:bg-lavanda/10 transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(b.id)}
                className="text-xs px-3 py-1 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {banners.length === 0 && (
          <p className="text-lavanda/40 text-sm text-center py-8">
            No hay banners creados
          </p>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-16 overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-navy-deep border border-lavanda/20 rounded-xl p-6 w-full max-w-lg space-y-4 mb-16"
          >
            <h2 className="font-[family-name:var(--font-cinzel)] text-lg font-bold text-niebla">
              {editing ? "Editar" : "Nuevo"} banner
            </h2>

            <div>
              <label className="block text-xs text-lavanda/60 mb-1">Título</label>
              <input
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
              />
            </div>

            <div>
              <label className="block text-xs text-lavanda/60 mb-1">Subtítulo</label>
              <input
                value={form.subtitulo}
                onChange={(e) => setForm({ ...form, subtitulo: e.target.value })}
                className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
              />
            </div>

            <div>
              <label className="block text-xs text-lavanda/60 mb-1">URL de imagen</label>
              <input
                value={form.imagen_url}
                onChange={(e) => setForm({ ...form, imagen_url: e.target.value })}
                placeholder="https://..."
                className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
              />
              {form.imagen_url && (
                <img src={form.imagen_url} alt="Preview" className="mt-2 h-20 rounded-lg object-cover" />
              )}
            </div>

            <div>
              <label className="block text-xs text-lavanda/60 mb-1">Link (destino al hacer click)</label>
              <input
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="/catalogo o /coleccion/one-piece"
                className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
              />
            </div>

            <div>
              <label className="block text-xs text-lavanda/60 mb-1">Posición</label>
              <select
                value={form.posicion}
                onChange={(e) => setForm({ ...form, posicion: e.target.value as Banner["posicion"] })}
                className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
              >
                {POSICIONES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-lavanda/60 mb-1">Fecha inicio (opc.)</label>
                <input
                  type="date"
                  value={form.fecha_inicio}
                  onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                  className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
                />
              </div>
              <div>
                <label className="block text-xs text-lavanda/60 mb-1">Fecha fin (opc.)</label>
                <input
                  type="date"
                  value={form.fecha_fin}
                  onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                  className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-lavanda/60 mb-1">Orden</label>
              <input
                type="number"
                value={form.orden}
                onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })}
                className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                className="accent-purpura"
              />
              <span className="text-sm text-lavanda-light">Activo</span>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-purpura hover:bg-purpura/80 text-niebla font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Guardando..." : editing ? "Guardar cambios" : "Crear banner"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-lavanda/20 text-lavanda-light rounded-lg hover:bg-lavanda/10 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
