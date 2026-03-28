"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Categoria } from "@/types";
import { slugify } from "@/lib/utils";

interface Props {
  categorias: (Categoria & { children?: Categoria[] })[];
  allCategorias: Categoria[];
}

export default function CategoriasManager({ categorias, allCategorias }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [nombre, setNombre] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState("");
  const [orden, setOrden] = useState(0);

  const roots = allCategorias.filter((c) => !c.parent_id);

  function resetForm() {
    setNombre("");
    setSlug("");
    setParentId("");
    setOrden(0);
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(cat: Categoria) {
    setNombre(cat.nombre);
    setSlug(cat.slug);
    setParentId(cat.parent_id || "");
    setOrden(cat.orden);
    setEditingId(cat.id);
    setShowForm(true);
  }

  function startNew() {
    resetForm();
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const body = {
      nombre,
      slug: slug || slugify(nombre),
      parent_id: parentId || null,
      orden,
      activo: true,
    };

    const url = editingId
      ? `/api/admin/categorias/${editingId}`
      : "/api/admin/categorias";
    const method = editingId ? "PATCH" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);
    resetForm();
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta categoría?")) return;
    await fetch(`/api/admin/categorias/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function toggleActive(cat: Categoria) {
    await fetch(`/api/admin/categorias/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !cat.activo }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <button
        onClick={startNew}
        className="px-4 py-2 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-medium rounded-lg transition-colors"
      >
        + Nueva categoría
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-niebla">
            {editingId ? "Editar categoría" : "Nueva categoría"}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-lavanda/60 mb-1">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  if (!editingId) setSlug(slugify(e.target.value));
                }}
                required
                className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
              />
            </div>
            <div>
              <label className="block text-xs text-lavanda/60 mb-1">Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
              />
            </div>
            <div>
              <label className="block text-xs text-lavanda/60 mb-1">Categoría padre</label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
              >
                <option value="">Ninguna (raíz)</option>
                {roots
                  .filter((r) => r.id !== editingId)
                  .map((r) => (
                    <option key={r.id} value={r.id}>{r.nombre}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-lavanda/60 mb-1">Orden</label>
              <input
                type="number"
                value={orden}
                onChange={(e) => setOrden(Number(e.target.value))}
                className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purpura hover:bg-purpura/80 disabled:bg-purpura/40 text-niebla text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? "Guardando..." : editingId ? "Guardar" : "Crear"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-lavanda/20 text-lavanda-light hover:bg-lavanda/5 text-sm rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Tree display */}
      <div className="bg-navy rounded-xl border border-lavanda/10 overflow-hidden">
        {categorias.length > 0 ? (
          <div className="divide-y divide-lavanda/5">
            {categorias.map((cat) => (
              <div key={cat.id}>
                <CategoryRow
                  cat={cat}
                  depth={0}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  onToggleActive={toggleActive}
                />
                {cat.children?.map((child) => (
                  <CategoryRow
                    key={child.id}
                    cat={child}
                    depth={1}
                    onEdit={startEdit}
                    onDelete={handleDelete}
                    onToggleActive={toggleActive}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-lavanda/40">No hay categorías</p>
        )}
      </div>
    </div>
  );
}

function CategoryRow({
  cat,
  depth,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  cat: Categoria;
  depth: number;
  onEdit: (cat: Categoria) => void;
  onDelete: (id: string) => void;
  onToggleActive: (cat: Categoria) => void;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 hover:bg-lavanda/5 transition-colors`}>
      <div className="flex items-center gap-2" style={{ paddingLeft: depth * 24 }}>
        {depth > 0 && <span className="text-lavanda/20">└</span>}
        <span className={`text-sm ${cat.activo ? "text-lavanda-light" : "text-lavanda/30 line-through"}`}>
          {cat.nombre}
        </span>
        <span className="text-xs text-lavanda/30 font-mono">/{cat.slug}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggleActive(cat)}
          className={`text-xs px-2 py-0.5 rounded-full ${
            cat.activo ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
          }`}
        >
          {cat.activo ? "Activa" : "Inactiva"}
        </button>
        <button
          onClick={() => onEdit(cat)}
          className="text-xs text-ambar hover:text-ambar-light transition-colors"
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(cat.id)}
          className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
