"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import type { KitComponente } from "@/types";

/** Producto elegible como componente (los kits quedan afuera). */
export interface ProductoElegible {
  id: string;
  nombre: string;
  precio: number;
  precio_oferta: number | null;
  imagen_url: string | null;
}

interface ComponenteLocal {
  producto_id: string;
  cantidad: number;
}

interface Props {
  kitId: string;
  /** Precio del kit, para contrastarlo con la suma de sus partes. */
  precioKit: number;
  componentes: KitComponente[];
  candidatos: ProductoElegible[];
}

function precioDe(p: ProductoElegible) {
  return p.precio_oferta || p.precio;
}

export default function KitComponentesManager({
  kitId,
  precioKit,
  componentes,
  candidatos,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<ComponenteLocal[]>(() =>
    componentes
      .slice()
      .sort((a, b) => a.orden - b.orden)
      .map((c) => ({ producto_id: c.producto_id, cantidad: c.cantidad }))
  );
  const [busqueda, setBusqueda] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const porId = useMemo(() => {
    const m = new Map<string, ProductoElegible>();
    for (const p of candidatos) m.set(p.id, p);
    return m;
  }, [candidatos]);

  const yaAgregados = new Set(items.map((i) => i.producto_id));

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return [];
    return candidatos
      .filter((p) => !yaAgregados.has(p.id) && p.nombre.toLowerCase().includes(q))
      .slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, candidatos, items]);

  // Suma de las partes a precio de lista: es contra esto que se mide el ahorro.
  const sumaPartes = items.reduce((acc, i) => {
    const p = porId.get(i.producto_id);
    return acc + (p ? precioDe(p) * i.cantidad : 0);
  }, 0);
  const ahorro = sumaPartes - precioKit;

  function agregar(productoId: string) {
    setItems((prev) => [...prev, { producto_id: productoId, cantidad: 1 }]);
    setBusqueda("");
  }

  function quitar(productoId: string) {
    setItems((prev) => prev.filter((i) => i.producto_id !== productoId));
  }

  function cambiarCantidad(productoId: string, cantidad: number) {
    setItems((prev) =>
      prev.map((i) =>
        i.producto_id === productoId
          ? { ...i, cantidad: Math.min(999, Math.max(1, cantidad)) }
          : i
      )
    );
  }

  async function handleSave() {
    setError("");
    setSuccess(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/productos/${kitId}/componentes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ componentes: items }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al guardar los componentes");
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
          Qué incluye el kit
        </h3>
        <span className="text-xs text-lavanda/60">
          {items.length} {items.length === 1 ? "producto" : "productos"}
        </span>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 text-red-400 text-xs">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-emerald-400 text-xs">
          Componentes guardados
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar un producto para agregar..."
          className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light placeholder:text-lavanda/40 focus:outline-none focus:border-purpura"
        />
        {resultados.length > 0 && (
          <ul className="absolute z-20 w-full mt-1 bg-navy-deep border border-lavanda/20 rounded-lg shadow-lg max-h-56 overflow-y-auto">
            {resultados.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => agregar(p.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-purpura/20 transition-colors"
                >
                  {p.imagen_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imagen_url}
                      alt=""
                      className="w-8 h-8 rounded object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-navy shrink-0" />
                  )}
                  <span className="flex-1 min-w-0 truncate text-sm text-lavanda-light">
                    {p.nombre}
                  </span>
                  <span className="text-xs text-lavanda/60 whitespace-nowrap">
                    {formatPrice(precioDe(p))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {busqueda.trim() && resultados.length === 0 && (
          <p className="mt-1 text-xs text-lavanda/50">Sin resultados</p>
        )}
      </div>

      {/* Componentes cargados */}
      {items.length === 0 ? (
        <p className="text-xs text-lavanda/50">
          Todavía no cargaste qué trae el kit. Buscá productos arriba para
          agregarlos.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const p = porId.get(item.producto_id);
            return (
              <li
                key={item.producto_id}
                className="flex items-center gap-2 bg-navy-deep border border-lavanda/10 rounded-lg p-2"
              >
                {p?.imagen_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imagen_url}
                    alt=""
                    className="w-9 h-9 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded bg-navy shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-lavanda-light truncate">
                    {p?.nombre ?? "Producto no encontrado"}
                  </p>
                  {p && (
                    <p className="text-xs text-lavanda/50">
                      {formatPrice(precioDe(p))} c/u
                    </p>
                  )}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={item.cantidad}
                  onChange={(e) => {
                    const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
                    cambiarCantidad(item.producto_id, Number.isNaN(n) ? 1 : n);
                  }}
                  className="w-12 px-2 py-1 text-center bg-navy border border-lavanda/20 rounded text-sm text-niebla focus:outline-none focus:border-purpura"
                  aria-label={`Cantidad de ${p?.nombre ?? "producto"}`}
                />
                <button
                  type="button"
                  onClick={() => quitar(item.producto_id)}
                  className="text-lavanda/50 hover:text-red-400 transition-colors px-1"
                  aria-label="Quitar del kit"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Referencia de precio */}
      {items.length > 0 && (
        <div className="border-t border-lavanda/10 pt-3 space-y-1 text-xs">
          <div className="flex justify-between text-lavanda/70">
            <span>Suma de las partes</span>
            <span>{formatPrice(sumaPartes)}</span>
          </div>
          <div className="flex justify-between text-lavanda/70">
            <span>Precio del kit</span>
            <span>{formatPrice(precioKit)}</span>
          </div>
          <div
            className={`flex justify-between font-semibold ${
              ahorro > 0 ? "text-emerald-400" : "text-ambar"
            }`}
          >
            <span>{ahorro > 0 ? "El cliente ahorra" : "Sin ahorro"}</span>
            <span>
              {ahorro > 0
                ? `${formatPrice(ahorro)} (${Math.round((ahorro / sumaPartes) * 100)}%)`
                : formatPrice(0)}
            </span>
          </div>
          {ahorro <= 0 && (
            <p className="text-lavanda/50 pt-1">
              El kit sale igual o más que comprar las partes por separado. Bajá
              el precio del kit para que convenga.
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full px-4 py-2 bg-purpura hover:bg-purpura/80 disabled:bg-purpura/40 text-niebla text-sm font-semibold rounded-lg transition-colors"
      >
        {saving ? "Guardando..." : "Guardar componentes"}
      </button>
    </div>
  );
}
