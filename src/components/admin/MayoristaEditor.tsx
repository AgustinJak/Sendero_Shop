"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/utils";
import { calcularKit, precioUnitario } from "@/lib/mayorista";
import type {
  MayoristaLista,
  MayoristaSeccion,
  MayoristaItem,
  MayoristaTramo,
  MayoristaKit,
} from "@/types";

type ItemValue = string | number | boolean | null;

// ─── ItemCard ─────────────────────────────────────────────────────────────────

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
  onUpdate: (id: string, field: string, value: ItemValue) => void;
}) {
  const [codigo, setCodigo] = useState(item.codigo_ref);
  const [pvp, setPvp] = useState(item.precio_pvp?.toString() ?? "");

  async function saveField(field: string, value: ItemValue) {
    await fetch(`/api/admin/mayoristas/${listaId}/secciones/${seccionId}/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    onUpdate(item.id, field, value);
  }

  async function handleDelete() {
    if (!confirm("¿Quitar este producto de la lista?")) return;
    await fetch(`/api/admin/mayoristas/${listaId}/secciones/${seccionId}/items/${item.id}`, {
      method: "DELETE",
    });
    onDelete(item.id);
  }

  const media = item.imagenes ?? [];
  const imagen = media.find((m) => m.tipo !== "video") ?? media[0];

  return (
    <div className="bg-navy border border-lavanda/10 rounded-xl overflow-hidden flex flex-col">
      {/* Imagen */}
      <div className="relative">
        {imagen ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagen.url} alt={item.titulo} className="w-full aspect-square object-cover" />
        ) : (
          <div className="w-full aspect-square flex items-center justify-center text-lavanda/20 text-xs bg-navy-deep">
            sin imagen
          </div>
        )}
        {/* Toggle destacado */}
        <button
          onClick={() => saveField("destacado", !item.destacado)}
          title={item.destacado ? "Quitar de destacados" : "Marcar como destacado / alta rotación"}
          className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors ${
            item.destacado
              ? "bg-ambar text-navy"
              : "bg-black/50 text-lavanda/60 hover:text-ambar"
          }`}
        >
          ★
        </button>
      </div>

      {/* Campos */}
      <div className="p-3 space-y-2">
        <p className="text-sm text-niebla font-medium leading-snug line-clamp-2" title={item.titulo}>
          {item.titulo}
        </p>

        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onBlur={() => saveField("codigo_ref", codigo)}
          className="w-full bg-navy-deep text-xs text-lavanda-light font-mono rounded px-2 py-1 focus:outline-none border border-lavanda/10 focus:border-purpura"
          placeholder="SKU / código"
        />

        {/* PVP (precio de lista) — el descuento mayorista se aplica por tramos */}
        <label className="block">
          <span className="text-[10px] text-lavanda/50 uppercase tracking-wide">PVP (precio de lista)</span>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-lavanda/40 pointer-events-none">$</span>
            <input
              value={pvp}
              onChange={(e) => setPvp(e.target.value)}
              onBlur={() => saveField("precio_pvp", pvp ? Number(pvp) : null)}
              type="number"
              className="w-full bg-navy-deep text-xs text-lavanda-light rounded pl-5 pr-2 py-1 focus:outline-none border border-lavanda/10 focus:border-purpura"
              placeholder="PVP"
            />
          </div>
        </label>
        <p className="text-[10px] text-lavanda/40 leading-tight">
          El descuento mayorista se calcula con los tramos por cantidad de la lista.
        </p>

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

// ─── Catálogo Modal ───────────────────────────────────────────────────────────

interface ProductoBuscado {
  id: string;
  nombre: string;
  sku: string | null;
  precio: number;
  precio_oferta: number | null;
  imagen?: string;
}

function CatalogoModal({
  onAdd,
  onClose,
}: {
  onAdd: (productoId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductoBuscado[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("productos")
          .select("id, nombre, sku, precio, precio_oferta, imagenes:producto_imagenes(url, orden, tipo)")
          .eq("activo", true)
          .ilike("nombre", `%${query}%`)
          .limit(15);
        if (ctrl.signal.aborted) return;
        const mapped: ProductoBuscado[] = (data ?? []).map((p) => {
          const img = (p.imagenes as { url: string; orden: number; tipo?: string }[] | null)
            ?.filter((i) => i.tipo !== "video")
            ?.sort((a, b) => a.orden - b.orden)[0];
          return {
            id: p.id,
            nombre: p.nombre,
            sku: p.sku,
            precio: p.precio,
            precio_oferta: p.precio_oferta,
            imagen: img?.url,
          };
        });
        setResults(mapped);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query]);

  async function handleAdd(id: string) {
    setAdding(id);
    await onAdd(id);
    setAdding(null);
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center pt-12 px-4 overflow-y-auto">
      <div className="bg-navy-deep border border-lavanda/20 rounded-xl w-full max-w-2xl mb-12">
        <div className="flex items-center justify-between p-4 border-b border-lavanda/10">
          <h3 className="font-[family-name:var(--font-cinzel)] text-niebla font-bold">
            Agregar del catálogo
          </h3>
          <button onClick={onClose} className="text-lavanda/40 hover:text-niebla transition-colors text-xl leading-none">×</button>
        </div>

        <div className="p-4 space-y-4">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto por nombre..."
            className="w-full bg-navy border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
          />

          <div className="max-h-[50vh] overflow-auto">
            {loading && <p className="text-sm text-lavanda/40 py-4 text-center">Buscando...</p>}
            {!loading && query && results.length === 0 && (
              <p className="text-sm text-lavanda/40 py-4 text-center">Sin resultados</p>
            )}
            {!loading && !query && (
              <p className="text-sm text-lavanda/40 py-4 text-center">Escribí para buscar en el catálogo</p>
            )}
            <div className="space-y-2">
              {results.map((p) => (
                <div key={p.id} className="flex items-center gap-3 bg-navy border border-lavanda/10 rounded-xl p-2.5">
                  {p.imagen ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imagen} alt={p.nombre} className="w-12 h-12 object-cover rounded-lg shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-navy-deep shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-niebla truncate">{p.nombre}</p>
                    <p className="text-xs text-lavanda/50">
                      {p.sku ? `${p.sku} · ` : ""}
                      {formatPrice(p.precio_oferta ?? p.precio)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAdd(p.id)}
                    disabled={adding === p.id}
                    className="shrink-0 px-3 py-1.5 bg-purpura/20 hover:bg-purpura text-lavanda-light hover:text-niebla text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {adding === p.id ? "Agregando..." : "+ Agregar"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Config de la lista (MOQ / validez / tramos) ──────────────────────────────

function ListaConfig({
  lista,
  onChange,
}: {
  lista: MayoristaLista;
  onChange: (patch: Partial<MayoristaLista>) => void;
}) {
  const [moq, setMoq] = useState(lista.moq?.toString() ?? "");
  const [validez, setValidez] = useState(lista.validez_hasta ?? "");
  const [tramos, setTramos] = useState<MayoristaTramo[]>(lista.descuento_tramos ?? []);

  async function patch(body: Partial<MayoristaLista>) {
    await fetch(`/api/admin/mayoristas/${lista.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    onChange(body);
  }

  function saveTramos(next: MayoristaTramo[]) {
    setTramos(next);
    patch({ descuento_tramos: next });
  }

  return (
    <section className="bg-navy border border-lavanda/10 rounded-xl p-4 space-y-4">
      <h2 className="text-sm font-semibold text-niebla">Configuración de la lista</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-lavanda/60 mb-1">Pedido mínimo (unidades)</label>
          <input
            type="number"
            value={moq}
            onChange={(e) => setMoq(e.target.value)}
            onBlur={() => patch({ moq: moq ? Number(moq) : null })}
            placeholder="Ej: 5"
            className="w-full bg-navy-deep border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-lavanda-light focus:outline-none focus:border-purpura"
          />
        </div>
        <div>
          <label className="block text-xs text-lavanda/60 mb-1">Lista válida hasta</label>
          <input
            type="date"
            value={validez}
            onChange={(e) => setValidez(e.target.value)}
            onBlur={() => patch({ validez_hasta: validez || null })}
            className="w-full bg-navy-deep border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-lavanda-light focus:outline-none focus:border-purpura"
          />
        </div>
      </div>

      {/* Tramos por cantidad */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-lavanda/60">Tramos por cantidad (descuento sobre PVP)</label>
          <button
            onClick={() => saveTramos([...tramos, { min: 0, pct: 0 }])}
            className="text-xs text-purpura hover:text-purpura/80"
          >
            + Agregar tramo
          </button>
        </div>
        <div className="space-y-2">
          {tramos.length === 0 && (
            <p className="text-xs text-lavanda/40">Sin tramos. Ej: desde 5u → 10%, 10u → 20%, 20u → 30%.</p>
          )}
          {tramos.map((t, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-lavanda/50">Desde</span>
              <input
                type="number"
                value={t.min || ""}
                onChange={(e) => {
                  const next = [...tramos];
                  next[i] = { ...next[i], min: Number(e.target.value) || 0 };
                  setTramos(next);
                }}
                onBlur={() => saveTramos(tramos)}
                className="w-20 bg-navy-deep border border-lavanda/20 rounded px-2 py-1 text-sm text-lavanda-light focus:outline-none focus:border-purpura"
              />
              <span className="text-xs text-lavanda/50">unidades →</span>
              <input
                type="number"
                value={t.pct || ""}
                onChange={(e) => {
                  const next = [...tramos];
                  next[i] = { ...next[i], pct: Number(e.target.value) || 0 };
                  setTramos(next);
                }}
                onBlur={() => saveTramos(tramos)}
                className="w-20 bg-navy-deep border border-lavanda/20 rounded px-2 py-1 text-sm text-ambar focus:outline-none focus:border-purpura"
              />
              <span className="text-xs text-ambar">% OFF</span>
              <button
                onClick={() => saveTramos(tramos.filter((_, idx) => idx !== i))}
                className="ml-auto text-red-400/60 hover:text-red-400 text-sm"
                aria-label="Quitar tramo"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export default function MayoristaEditor({ lista: initialLista }: { lista: MayoristaLista }) {
  const router = useRouter();
  const [lista, setLista] = useState(initialLista);
  const [nombre, setNombre] = useState(initialLista.nombre);
  const [savingMeta, setSavingMeta] = useState(false);
  const [addingSeccion, setAddingSeccion] = useState(false);
  const [catalogoModal, setCatalogoModal] = useState<string | null>(null); // seccionId
  const [copied, setCopied] = useState(false);
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

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

  async function addItemFromCatalogo(seccionId: string, productoId: string) {
    const res = await fetch(`/api/admin/mayoristas/${lista.id}/secciones/${seccionId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ producto_id: productoId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Error al agregar el producto");
      return;
    }
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

  function handleItemUpdate(seccionId: string, itemId: string, field: string, value: ItemValue) {
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

      {/* Config de la lista */}
      <ListaConfig
        lista={lista}
        onChange={(patch) => setLista((prev) => ({ ...prev, ...patch }))}
      />

      {/* Secciones */}
      {secciones.map((seccion) => (
        <SeccionBlock
          key={seccion.id}
          seccion={seccion}
          listaId={lista.id}
          onTituloBlur={(titulo) => updateSeccionTitulo(seccion.id, titulo)}
          onDelete={() => deleteSeccion(seccion.id)}
          onOpenCatalogo={() => setCatalogoModal(seccion.id)}
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

      {/* Kits / combos */}
      <KitsSection
        kits={lista.kits ?? []}
        listaId={lista.id}
        tramos={lista.descuento_tramos ?? []}
        allItems={secciones.flatMap((s) => s.items ?? [])}
        onCreated={(kit) =>
          setLista((p) => ({ ...p, kits: [...(p.kits ?? []), kit] }))
        }
        onSaved={(kit) =>
          setLista((p) => ({
            ...p,
            kits: (p.kits ?? []).map((k) => (k.id === kit.id ? kit : k)),
          }))
        }
        onDeleted={(kitId) =>
          setLista((p) => ({
            ...p,
            kits: (p.kits ?? []).filter((k) => k.id !== kitId),
          }))
        }
      />

      {/* Modal catálogo */}
      {catalogoModal && (
        <CatalogoModal
          onClose={() => setCatalogoModal(null)}
          onAdd={async (productoId) => {
            await addItemFromCatalogo(catalogoModal, productoId);
          }}
        />
      )}
    </div>
  );
}

// ─── Kits / Combos ────────────────────────────────────────────────────────────

function KitsSection({
  kits,
  listaId,
  tramos,
  allItems,
  onCreated,
  onSaved,
  onDeleted,
}: {
  kits: MayoristaKit[];
  listaId: string;
  tramos: MayoristaTramo[];
  allItems: MayoristaItem[];
  onCreated: (kit: MayoristaKit) => void;
  onSaved: (kit: MayoristaKit) => void;
  onDeleted: (kitId: string) => void;
}) {
  const [creating, setCreating] = useState(false);

  async function crearKit() {
    setCreating(true);
    const res = await fetch(`/api/admin/mayoristas/${listaId}/kits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: "Nuevo kit", items: [] }),
    });
    setCreating(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Error al crear el kit");
      return;
    }
    onCreated(await res.json());
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-ambar/20" />
        <h2 className="text-sm font-semibold text-ambar uppercase tracking-wider">
          Kits / Combos
        </h2>
        <div className="h-px flex-1 bg-ambar/20" />
      </div>

      {kits.map((kit) => (
        <KitCard
          key={kit.id}
          kit={kit}
          listaId={listaId}
          tramos={tramos}
          allItems={allItems}
          onSaved={onSaved}
          onDeleted={onDeleted}
        />
      ))}

      <button
        onClick={crearKit}
        disabled={creating || allItems.length === 0}
        title={allItems.length === 0 ? "Agregá productos a la lista primero" : undefined}
        className="w-full py-3 border-2 border-dashed border-ambar/25 rounded-xl text-sm text-ambar/60 hover:text-ambar hover:border-ambar/50 transition-colors disabled:opacity-40"
      >
        {creating ? "Creando..." : "+ Nuevo kit"}
      </button>
    </div>
  );
}

function KitCard({
  kit,
  listaId,
  tramos,
  allItems,
  onSaved,
  onDeleted,
}: {
  kit: MayoristaKit;
  listaId: string;
  tramos: MayoristaTramo[];
  allItems: MayoristaItem[];
  onSaved: (kit: MayoristaKit) => void;
  onDeleted: (kitId: string) => void;
}) {
  const [nombre, setNombre] = useState(kit.nombre);
  const [descripcion, setDescripcion] = useState(kit.descripcion ?? "");
  const [pct, setPct] = useState(String(Number(kit.descuento_extra_pct) || 0));
  const [kitItems, setKitItems] = useState<{ item_id: string; cantidad: number }[]>(
    (kit.items ?? []).map((ki) => ({ item_id: ki.item_id, cantidad: ki.cantidad }))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Kit sintético con items completos para el preview de precio
  const preview = calcularKit(
    {
      ...kit,
      descuento_extra_pct: Number(pct) || 0,
      items: kitItems
        .map((ki) => {
          const item = allItems.find((i) => i.id === ki.item_id);
          return item
            ? { id: ki.item_id, kit_id: kit.id, item_id: ki.item_id, cantidad: ki.cantidad, item }
            : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    },
    tramos
  );

  const disponibles = allItems.filter(
    (i) => !kitItems.some((ki) => ki.item_id === i.id)
  );

  async function guardar() {
    setSaving(true);
    const res = await fetch(`/api/admin/mayoristas/${listaId}/kits/${kit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre: nombre.trim() || "Kit",
        descripcion: descripcion.trim() || null,
        descuento_extra_pct: Number(pct) || 0,
        items: kitItems,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? "Error al guardar el kit");
      return;
    }
    onSaved(await res.json());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar el kit "${nombre}"?`)) return;
    await fetch(`/api/admin/mayoristas/${listaId}/kits/${kit.id}`, { method: "DELETE" });
    onDeleted(kit.id);
  }

  return (
    <div className="bg-navy border border-ambar/15 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-48 space-y-2">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del kit"
            className="w-full bg-transparent text-base font-semibold text-niebla focus:outline-none border-b border-transparent focus:border-lavanda/30 pb-0.5 transition-colors"
          />
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Descripción (opcional)"
            className="w-full bg-transparent text-xs text-lavanda-light focus:outline-none border-b border-transparent focus:border-lavanda/30 pb-0.5 transition-colors placeholder-lavanda/30"
          />
        </div>
        <label className="shrink-0">
          <span className="block text-[10px] text-ambar/70 uppercase tracking-wide mb-0.5">
            Desc. extra kit
          </span>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              className="w-20 bg-navy-deep border border-lavanda/20 rounded-lg pl-2 pr-6 py-1.5 text-sm text-ambar focus:outline-none focus:border-purpura"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-ambar/60 pointer-events-none">%</span>
          </div>
        </label>
      </div>

      {/* Items del kit */}
      <div className="space-y-1.5">
        {kitItems.map((ki) => {
          const item = allItems.find((i) => i.id === ki.item_id);
          const linea =
            item?.precio_pvp != null
              ? precioUnitario(item.precio_pvp, tramos, ki.cantidad)
              : null;
          return (
            <div key={ki.item_id} className="flex items-center gap-2 bg-navy-deep rounded-lg px-2.5 py-1.5">
              <input
                type="number"
                min={1}
                value={ki.cantidad}
                onChange={(e) =>
                  setKitItems((prev) =>
                    prev.map((k) =>
                      k.item_id === ki.item_id
                        ? { ...k, cantidad: Math.max(1, Number(e.target.value) || 1) }
                        : k
                    )
                  )
                }
                className="w-14 bg-navy border border-lavanda/20 rounded px-1.5 py-0.5 text-sm text-niebla text-center focus:outline-none focus:border-purpura"
              />
              <span className="text-xs text-lavanda/50">×</span>
              <span className="flex-1 min-w-0 text-sm text-lavanda-light truncate">
                {item?.titulo ?? "Producto (fuera de la lista)"}
              </span>
              {linea != null && (
                <span className="text-xs text-ambar whitespace-nowrap">
                  {formatPrice(linea.precio)} c/u
                  {linea.pct > 0 && <span className="text-ambar/50"> (-{linea.pct}%)</span>}
                </span>
              )}
              <button
                onClick={() =>
                  setKitItems((prev) => prev.filter((k) => k.item_id !== ki.item_id))
                }
                className="text-red-400/60 hover:text-red-400 text-sm px-1"
                aria-label="Quitar del kit"
              >
                ×
              </button>
            </div>
          );
        })}

        {disponibles.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              setKitItems((prev) => [...prev, { item_id: e.target.value, cantidad: 1 }]);
            }}
            className="w-full bg-navy-deep border border-dashed border-lavanda/20 rounded-lg px-2.5 py-1.5 text-sm text-lavanda/60 focus:outline-none focus:border-purpura cursor-pointer"
          >
            <option value="">+ Agregar producto al kit...</option>
            {disponibles.map((i) => (
              <option key={i.id} value={i.id}>
                {i.titulo}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Preview del precio */}
      {kitItems.length > 0 && (
        <div className="bg-navy-deep rounded-lg p-3 text-sm space-y-1">
          <div className="flex justify-between text-lavanda/60 text-xs">
            <span>Todo a PVP ({preview.totalUnidades}u)</span>
            <span className="line-through">{formatPrice(preview.subtotalPvp)}</span>
          </div>
          <div className="flex justify-between text-lavanda-light text-xs">
            <span>Con descuento por cantidad</span>
            <span>{formatPrice(preview.subtotalConTramos)}</span>
          </div>
          {preview.descuentoExtraPct > 0 && (
            <div className="flex justify-between text-emerald-400 text-xs">
              <span>Descuento kit (−{preview.descuentoExtraPct}%)</span>
              <span>−{formatPrice(preview.descuentoExtraMonto)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-niebla pt-1 border-t border-lavanda/10">
            <span>Total del kit</span>
            <span className="text-ambar">{formatPrice(preview.total)}</span>
          </div>
          {!preview.completo && (
            <p className="text-[11px] text-amber-400/80 pt-1">
              ⚠ Hay productos sin PVP cargado — no suman al total.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={guardar}
          disabled={saving}
          className="px-4 py-1.5 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar kit"}
        </button>
        <button
          onClick={eliminar}
          className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
        >
          Eliminar kit
        </button>
      </div>
    </div>
  );
}

// ─── SeccionBlock ─────────────────────────────────────────────────────────────

function SeccionBlock({
  seccion,
  listaId,
  onTituloBlur,
  onDelete,
  onOpenCatalogo,
  onItemDelete,
  onItemUpdate,
}: {
  seccion: MayoristaSeccion;
  listaId: string;
  onTituloBlur: (titulo: string) => void;
  onDelete: () => void;
  onOpenCatalogo: () => void;
  onItemDelete: (itemId: string) => void;
  onItemUpdate: (itemId: string, field: string, value: ItemValue) => void;
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

      {/* Agregar del catálogo */}
      <button
        onClick={onOpenCatalogo}
        className="flex items-center gap-2 px-4 py-2 bg-purpura/20 hover:bg-purpura/30 text-purpura text-sm rounded-lg transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z" />
        </svg>
        Agregar del catálogo
      </button>
    </div>
  );
}
