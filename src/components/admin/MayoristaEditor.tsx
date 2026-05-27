"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MayoristaLista, MayoristaSeccion, MayoristaItem } from "@/types";
import type { ScrapedModel } from "@/app/api/admin/mayoristas/scrape/route";

// ─── Sub-components ───────────────────────────────────────────────────────────

function ItemCard({
  item,
  listaId,
  seccionId,
  onDelete,
  onUpdate,
}: {
  item: MayoristaItem;
  listaId: string;
  seccionId: string;
  onDelete: (id: string) => void;
  onUpdate: (id: string, field: string, value: string | number | null) => void;
}) {
  const [titulo, setTitulo] = useState(item.titulo);
  const [codigo, setCodigo] = useState(item.codigo_ref);
  const [precio, setPrecio] = useState(item.precio_ars?.toString() ?? "");

  async function saveField(field: string, value: string | number | null) {
    await fetch(`/api/admin/mayoristas/${listaId}/secciones/${seccionId}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    onUpdate(item.id, field, value);
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar este producto de la lista?")) return;
    await fetch(`/api/admin/mayoristas/${listaId}/secciones/${seccionId}/items/${item.id}`, {
      method: "DELETE",
    });
    onDelete(item.id);
  }

  const imagenes = item.imagenes ?? [];

  return (
    <div className="bg-navy border border-lavanda/10 rounded-xl overflow-hidden">
      {/* Imágenes */}
      {imagenes.length > 0 ? (
        <div className="flex gap-1 p-2 overflow-x-auto">
          {imagenes.map((img) => (
            <img
              key={img.id}
              src={img.url}
              alt={titulo}
              className="w-20 h-20 object-cover rounded-lg shrink-0"
            />
          ))}
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center text-lavanda/20 text-xs bg-navy-deep">
          sin imágenes
        </div>
      )}

      {/* Campos */}
      <div className="p-3 space-y-2">
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={() => saveField("titulo", titulo)}
          className="w-full bg-transparent text-sm text-niebla font-medium focus:outline-none border-b border-transparent focus:border-lavanda/30 pb-0.5 transition-colors"
          placeholder="Título del producto"
        />
        <div className="flex gap-2">
          <input
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onBlur={() => saveField("codigo_ref", codigo)}
            className="flex-1 bg-navy-deep text-xs text-lavanda-light font-mono rounded px-2 py-1 focus:outline-none border border-lavanda/10 focus:border-purpura"
            placeholder="REF-001"
          />
          <input
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            onBlur={() => saveField("precio_ars", precio ? Number(precio) : null)}
            type="number"
            className="w-24 bg-navy-deep text-xs text-ambar font-medium rounded px-2 py-1 focus:outline-none border border-lavanda/10 focus:border-purpura"
            placeholder="Precio"
          />
        </div>
        <button
          onClick={handleDelete}
          className="w-full text-xs text-red-400/60 hover:text-red-400 transition-colors text-left"
        >
          Quitar
        </button>
      </div>
    </div>
  );
}

// ─── MakerWorld Search Modal ──────────────────────────────────────────────────

function MakerWorldModal({
  onAdd,
  onClose,
}: {
  onAdd: (model: ScrapedModel) => void;
  onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<ScrapedModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  async function search() {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    setResults([]);
    const res = await fetch(`/api/admin/mayoristas/scrape?keyword=${encodeURIComponent(keyword)}&limit=5`);
    const data = await res.json();
    setLoading(false);
    setResults(data.results ?? []);
    if (data.error) setError(data.error);
  }

  async function handleAdd(model: ScrapedModel) {
    setAdding(model.id);
    await onAdd(model);
    setAdding(null);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-12 px-4 overflow-y-auto">
      <div className="bg-navy-deep border border-lavanda/20 rounded-xl w-full max-w-2xl mb-12">
        <div className="flex items-center justify-between p-4 border-b border-lavanda/10">
          <h3 className="font-[family-name:var(--font-cinzel)] text-niebla font-bold">
            Buscar en MakerWorld
          </h3>
          <button onClick={onClose} className="text-lavanda/40 hover:text-niebla transition-colors text-xl leading-none">×</button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder='Ej: "maceta minimalista geometrica"'
              autoFocus
              className="flex-1 bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
            />
            <button
              onClick={search}
              disabled={loading || !keyword.trim()}
              className="px-4 py-2 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              {results.map((model) => (
                <div
                  key={model.id}
                  className="flex items-center gap-3 bg-navy border border-lavanda/10 rounded-xl p-3"
                >
                  {/* Thumbnails */}
                  <div className="flex gap-1 shrink-0">
                    {model.imagenes.slice(0, 3).map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={model.titulo}
                        className="w-14 h-14 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-niebla font-medium truncate">{model.titulo}</p>
                    <p className="text-xs text-lavanda/40 truncate">{model.url}</p>
                    <p className="text-xs text-lavanda/40">{model.imagenes.length} imágenes</p>
                  </div>
                  <button
                    onClick={() => handleAdd(model)}
                    disabled={adding === model.id}
                    className="shrink-0 px-3 py-1.5 bg-purpura/20 hover:bg-purpura text-lavanda-light hover:text-niebla text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {adding === model.id ? "Agregando..." : "+ Agregar"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && results.length === 0 && keyword && !error && (
            <p className="text-sm text-lavanda/40 text-center py-4">No se encontraron resultados</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export default function MayoristaEditor({ lista: initialLista }: { lista: MayoristaLista }) {
  const router = useRouter();
  const [lista, setLista] = useState(initialLista);
  const [nombre, setNombre] = useState(initialLista.nombre);
  const [savingMeta, setSavingMeta] = useState(false);
  const [addingSeccion, setAddingSeccion] = useState(false);
  const [searchModal, setSearchModal] = useState<string | null>(null); // seccionId
  const [copied, setCopied] = useState(false);
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  // ── Meta update ─────────────────────────────────────────────────────────────
  async function saveMeta() {
    if (nombre === initialLista.nombre) return;
    setSavingMeta(true);
    await fetch(`/api/admin/mayoristas/${lista.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    setSavingMeta(false);
  }

  // ── Secciones ────────────────────────────────────────────────────────────────
  async function addSeccion() {
    setAddingSeccion(true);
    const res = await fetch(`/api/admin/mayoristas/${lista.id}/secciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: "Nueva sección" }),
    });
    const seccion = await res.json();
    setAddingSeccion(false);
    setLista((prev) => ({
      ...prev,
      secciones: [...(prev.secciones ?? []), { ...seccion, items: [] }],
    }));
  }

  async function updateSeccionTitulo(seccionId: string, titulo: string) {
    await fetch(`/api/admin/mayoristas/${lista.id}/secciones/${seccionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo }),
    });
  }

  async function deleteSeccion(seccionId: string) {
    if (!confirm("¿Eliminar esta sección y todos sus productos?")) return;
    await fetch(`/api/admin/mayoristas/${lista.id}/secciones/${seccionId}`, { method: "DELETE" });
    setLista((prev) => ({
      ...prev,
      secciones: (prev.secciones ?? []).filter((s) => s.id !== seccionId),
    }));
  }

  // ── Items ────────────────────────────────────────────────────────────────────
  async function addItemFromMakerWorld(seccionId: string, model: ScrapedModel) {
    const res = await fetch(`/api/admin/mayoristas/${lista.id}/secciones/${seccionId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: model.titulo,
        codigo_ref: "",
        makerworld_url: model.url,
        imagenes: model.imagenes,
      }),
    });
    const item = await res.json();
    setLista((prev) => ({
      ...prev,
      secciones: (prev.secciones ?? []).map((s) =>
        s.id === seccionId ? { ...s, items: [...(s.items ?? []), item] } : s
      ),
    }));
  }

  function handleItemDelete(seccionId: string, itemId: string) {
    setLista((prev) => ({
      ...prev,
      secciones: (prev.secciones ?? []).map((s) =>
        s.id === seccionId
          ? { ...s, items: (s.items ?? []).filter((i) => i.id !== itemId) }
          : s
      ),
    }));
  }

  function handleItemUpdate(seccionId: string, itemId: string, field: string, value: string | number | null) {
    setLista((prev) => ({
      ...prev,
      secciones: (prev.secciones ?? []).map((s) =>
        s.id === seccionId
          ? {
              ...s,
              items: (s.items ?? []).map((i) =>
                i.id === itemId ? { ...i, [field]: value } : i
              ),
            }
          : s
      ),
    }));
  }

  function copyLink() {
    navigator.clipboard.writeText(`${siteUrl}/mayorista/${lista.codigo}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const secciones = lista.secciones ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0 space-y-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={saveMeta}
            className="text-xl font-[family-name:var(--font-cinzel)] font-bold text-niebla bg-transparent focus:outline-none border-b border-transparent focus:border-lavanda/30 w-full pb-0.5 transition-colors"
          />
          <p className="text-xs text-lavanda/40 font-mono">/mayorista/{lista.codigo}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={lista.activa}
              onChange={async (e) => {
                const newActiva = e.target.checked;
                setLista((p) => ({ ...p, activa: newActiva }));
                await fetch(`/api/admin/mayoristas/${lista.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ activa: newActiva }),
                });
              }}
              className="accent-purpura"
            />
            <span className="text-sm text-lavanda-light">Activa</span>
          </label>
          <button
            onClick={copyLink}
            className="px-3 py-1.5 border border-lavanda/20 text-lavanda-light text-sm rounded-lg hover:bg-lavanda/10 transition-colors"
          >
            {copied ? "¡Link copiado!" : "Copiar link"}
          </button>
          <a
            href={`/mayorista/${lista.codigo}`}
            target="_blank"
            className="px-3 py-1.5 border border-ambar/30 text-ambar text-sm rounded-lg hover:bg-ambar/10 transition-colors"
          >
            Ver lista →
          </a>
          <button
            onClick={() => router.push("/admin/mayoristas")}
            className="px-3 py-1.5 text-lavanda/40 text-sm hover:text-lavanda transition-colors"
          >
            ← Volver
          </button>
        </div>
      </div>

      {savingMeta && <p className="text-xs text-lavanda/40">Guardando...</p>}

      {/* Secciones */}
      {secciones.map((seccion) => (
        <SeccionBlock
          key={seccion.id}
          seccion={seccion}
          listaId={lista.id}
          onTituloBlur={(titulo) => updateSeccionTitulo(seccion.id, titulo)}
          onDelete={() => deleteSeccion(seccion.id)}
          onOpenSearch={() => setSearchModal(seccion.id)}
          onItemDelete={(itemId) => handleItemDelete(seccion.id, itemId)}
          onItemUpdate={(itemId, field, value) => handleItemUpdate(seccion.id, itemId, field, value)}
        />
      ))}

      {/* Agregar sección */}
      <button
        onClick={addSeccion}
        disabled={addingSeccion}
        className="w-full py-3 border-2 border-dashed border-lavanda/20 rounded-xl text-sm text-lavanda/40 hover:text-lavanda hover:border-lavanda/40 transition-colors disabled:opacity-50"
      >
        {addingSeccion ? "Agregando..." : "+ Agregar sección"}
      </button>

      {/* Modal de búsqueda */}
      {searchModal && (
        <MakerWorldModal
          onClose={() => setSearchModal(null)}
          onAdd={async (model) => {
            await addItemFromMakerWorld(searchModal, model);
          }}
        />
      )}
    </div>
  );
}

// ─── SeccionBlock ─────────────────────────────────────────────────────────────

function SeccionBlock({
  seccion,
  listaId,
  onTituloBlur,
  onDelete,
  onOpenSearch,
  onItemDelete,
  onItemUpdate,
}: {
  seccion: MayoristaSeccion;
  listaId: string;
  onTituloBlur: (titulo: string) => void;
  onDelete: () => void;
  onOpenSearch: () => void;
  onItemDelete: (itemId: string) => void;
  onItemUpdate: (itemId: string, field: string, value: string | number | null) => void;
}) {
  const [titulo, setTitulo] = useState(seccion.titulo);
  const items = seccion.items ?? [];

  return (
    <div className="space-y-3">
      {/* Título de sección */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-lavanda/10" />
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onBlur={() => onTituloBlur(titulo)}
          className="text-sm font-semibold text-lavanda-light bg-transparent focus:outline-none border-b border-transparent focus:border-lavanda/30 text-center min-w-48 pb-0.5 transition-colors uppercase tracking-wider"
        />
        <div className="h-px flex-1 bg-lavanda/10" />
        <button
          onClick={onDelete}
          className="text-lavanda/20 hover:text-red-400 transition-colors text-xs"
          title="Eliminar sección"
        >
          ×
        </button>
      </div>

      {/* Grid de items */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              listaId={listaId}
              seccionId={seccion.id}
              onDelete={onItemDelete}
              onUpdate={onItemUpdate}
            />
          ))}
        </div>
      )}

      {/* Botón agregar productos */}
      <button
        onClick={onOpenSearch}
        className="flex items-center gap-2 px-4 py-2 bg-navy border border-lavanda/20 text-lavanda-light text-sm rounded-lg hover:bg-lavanda/10 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        Buscar en MakerWorld
      </button>
    </div>
  );
}
