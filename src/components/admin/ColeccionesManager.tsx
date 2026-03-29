"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ColeccionRow {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  tipo: "automatica" | "manual";
  regla: Record<string, string> | null;
  meta_title: string | null;
  meta_description: string | null;
  imagen_cover: string | null;
  activa: boolean;
  orden: number;
  coleccion_productos: { producto_id: string }[];
  _auto_count: number | null;
}

interface ProductoOption {
  id: string;
  nombre: string;
  slug: string;
}

interface Props {
  colecciones: ColeccionRow[];
  productos: ProductoOption[];
}

const EMPTY_FORM = {
  nombre: "",
  slug: "",
  descripcion: "",
  tipo: "manual" as "manual" | "automatica",
  regla_linea: "",
  regla_categoria_slug: "",
  regla_tamano: "",
  meta_title: "",
  meta_description: "",
  imagen_cover: "" as string,
  activa: true,
  orden: 0,
  producto_ids: [] as string[],
};

export default function ColeccionesManager({ colecciones, productos }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  function toSlug(str: string) {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(col: ColeccionRow) {
    setForm({
      nombre: col.nombre,
      slug: col.slug,
      descripcion: col.descripcion || "",
      tipo: col.tipo,
      regla_linea: col.regla?.linea || "",
      regla_categoria_slug: col.regla?.categoria_slug || col.regla?.categoria || "",
      regla_tamano: col.regla?.tamano || "",
      meta_title: col.meta_title || "",
      meta_description: col.meta_description || "",
      imagen_cover: col.imagen_cover || "",
      activa: col.activa,
      orden: col.orden,
      producto_ids: col.coleccion_productos.map((cp) => cp.producto_id),
    });
    setEditing(col.id);
    setShowForm(true);
  }

  function buildBody() {
    const regla =
      form.tipo === "automatica"
        ? {
            ...(form.regla_linea ? { linea: form.regla_linea } : {}),
            ...(form.regla_categoria_slug ? { categoria_slug: form.regla_categoria_slug } : {}),
            ...(form.regla_tamano ? { tamano: form.regla_tamano } : {}),
          }
        : null;

    return {
      nombre: form.nombre,
      slug: form.slug,
      descripcion: form.descripcion || null,
      tipo: form.tipo,
      regla,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
      imagen_cover: form.imagen_cover || null,
      activa: form.activa,
      orden: form.orden,
      producto_ids: form.tipo === "manual" ? form.producto_ids : [],
    };
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editing) return;

    setUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("coleccion_id", editing);

      const res = await fetch("/api/admin/colecciones/cover", {
        method: "POST",
        body: fd,
      });

      if (res.ok) {
        const { url } = await res.json();
        setForm((f) => ({ ...f, imagen_cover: url }));
      }
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const url = editing
      ? `/api/admin/colecciones/${editing}`
      : "/api/admin/colecciones";

    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBody()),
    });

    setLoading(false);
    if (res.ok) {
      setShowForm(false);
      router.refresh();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta colección?")) return;
    await fetch(`/api/admin/colecciones/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function toggleActiva(col: ColeccionRow) {
    await fetch(`/api/admin/colecciones/${col.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: !col.activa }),
    });
    router.refresh();
  }

  function toggleProduct(pid: string) {
    setForm((f) => ({
      ...f,
      producto_ids: f.producto_ids.includes(pid)
        ? f.producto_ids.filter((id) => id !== pid)
        : [...f.producto_ids, pid],
    }));
  }

  return (
    <div className="space-y-6">
      <button
        onClick={openNew}
        className="px-4 py-2 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-medium rounded-lg transition-colors"
      >
        + Nueva colección
      </button>

      {/* List */}
      <div className="space-y-3">
        {colecciones.map((col) => (
          <div
            key={col.id}
            className="bg-navy-deep border border-lavanda/10 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-niebla font-medium">{col.nombre}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-lavanda/10 text-lavanda/60">
                  {col.tipo}
                </span>
                {!col.activa && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                    inactiva
                  </span>
                )}
              </div>
              <p className="text-sm text-lavanda/50 mt-1">
                /{col.slug} · {col.tipo === "automatica" && col._auto_count !== null ? col._auto_count : col.coleccion_productos.length} productos
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleActiva(col)}
                className="text-xs px-3 py-1 border border-lavanda/20 rounded-lg text-lavanda-light hover:bg-lavanda/10 transition-colors"
              >
                {col.activa ? "Desactivar" : "Activar"}
              </button>
              <button
                onClick={() => openEdit(col)}
                className="text-xs px-3 py-1 border border-lavanda/20 rounded-lg text-lavanda-light hover:bg-lavanda/10 transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(col.id)}
                className="text-xs px-3 py-1 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {colecciones.length === 0 && (
          <p className="text-lavanda/40 text-sm text-center py-8">
            No hay colecciones creadas
          </p>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-16 overflow-y-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-navy-deep border border-lavanda/20 rounded-xl p-6 w-full max-w-2xl space-y-4 mb-16"
          >
            <h2 className="font-[family-name:var(--font-cinzel)] text-lg font-bold text-niebla">
              {editing ? "Editar" : "Nueva"} colección
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-lavanda/60 mb-1">Nombre</label>
                <input
                  value={form.nombre}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      nombre: e.target.value,
                      slug: editing ? form.slug : toSlug(e.target.value),
                    })
                  }
                  className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-lavanda/60 mb-1">Slug</label>
                <input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-lavanda/60 mb-1">Descripción</label>
              <textarea
                value={form.descripcion}
                onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                rows={3}
                className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
              />
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-xs text-lavanda/60 mb-1">Tipo</label>
              <div className="flex gap-2">
                {(["manual", "automatica"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, tipo: t })}
                    className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
                      form.tipo === t
                        ? "border-purpura bg-purpura/10 text-niebla"
                        : "border-lavanda/10 text-lavanda-light"
                    }`}
                  >
                    {t === "manual" ? "Manual" : "Automática"}
                  </button>
                ))}
              </div>
            </div>

            {/* Automatic rules */}
            {form.tipo === "automatica" && (
              <div className="grid grid-cols-2 gap-4 bg-navy/50 rounded-lg p-4 border border-lavanda/10">
                <p className="col-span-2 text-xs text-lavanda/60">
                  Reglas — los productos que coincidan se incluyen automáticamente
                </p>
                <div>
                  <label className="block text-xs text-lavanda/60 mb-1">Línea</label>
                  <input
                    value={form.regla_linea}
                    onChange={(e) => setForm({ ...form, regla_linea: e.target.value })}
                    placeholder="Ej: One Piece, Minimalista"
                    className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
                  />
                </div>
                <div>
                  <label className="block text-xs text-lavanda/60 mb-1">Categoría (slug)</label>
                  <input
                    value={form.regla_categoria_slug}
                    onChange={(e) => setForm({ ...form, regla_categoria_slug: e.target.value })}
                    className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
                  />
                </div>
                <div>
                  <label className="block text-xs text-lavanda/60 mb-1">Tamaño</label>
                  <input
                    value={form.regla_tamano}
                    onChange={(e) => setForm({ ...form, regla_tamano: e.target.value })}
                    className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
                  />
                </div>
              </div>
            )}

            {/* Manual product selection */}
            {form.tipo === "manual" && (
              <div>
                <label className="block text-xs text-lavanda/60 mb-2">
                  Productos ({form.producto_ids.length} seleccionados)
                </label>
                <div className="max-h-48 overflow-y-auto bg-navy/50 rounded-lg border border-lavanda/10 p-2 space-y-1">
                  {productos.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-lavanda/5 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.producto_ids.includes(p.id)}
                        onChange={() => toggleProduct(p.id)}
                        className="accent-purpura"
                      />
                      <span className="text-sm text-lavanda-light">{p.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Cover image */}
            <div>
              <label className="block text-xs text-lavanda/60 mb-1">Imagen de portada</label>
              {form.imagen_cover && (
                <div className="relative mb-2 rounded-lg overflow-hidden">
                  <img
                    src={form.imagen_cover}
                    alt="Cover"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, imagen_cover: "" })}
                    className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white text-xs px-2 py-1 rounded transition-colors"
                  >
                    Quitar
                  </button>
                </div>
              )}
              {editing ? (
                <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                  uploadingCover
                    ? "bg-lavanda/10 text-lavanda/40"
                    : "bg-purpura/10 border border-purpura/30 text-purpura hover:bg-purpura/20"
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                    className="hidden"
                  />
                  {uploadingCover ? "Subiendo..." : "Subir imagen"}
                </label>
              ) : (
                <p className="text-xs text-lavanda/40">
                  Guardá la colección primero para subir una imagen.
                </p>
              )}
            </div>

            {/* SEO */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-lavanda/60 mb-1">Meta título (SEO)</label>
                <input
                  value={form.meta_title}
                  onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                  className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
                />
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
            </div>
            <div>
              <label className="block text-xs text-lavanda/60 mb-1">Meta descripción (SEO)</label>
              <textarea
                value={form.meta_description}
                onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                rows={2}
                className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.activa}
                onChange={(e) => setForm({ ...form, activa: e.target.checked })}
                className="accent-purpura"
              />
              <span className="text-sm text-lavanda-light">Activa</span>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 bg-purpura hover:bg-purpura/80 text-niebla font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? "Guardando..." : editing ? "Guardar cambios" : "Crear colección"}
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
