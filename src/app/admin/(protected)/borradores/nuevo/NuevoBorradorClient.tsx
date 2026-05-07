"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/utils";
import {
  calculateSubtotal,
  calculateDescuento,
  DEFAULT_EXPIRACION_HORAS,
} from "@/lib/borrador";
import type {
  PedidoBorradorItem,
  MetodoPago,
} from "@/types";

interface ProductoBuscado {
  id: string;
  nombre: string;
  sku: string | null;
  precio: number;
  precio_oferta: number | null;
  peso_gr: number | null;
  alto_cm: number | null;
  ancho_cm: number | null;
  largo_cm: number | null;
}

const METODOS_PAGO: { value: MetodoPago; label: string }[] = [
  { value: "mercadopago", label: "MercadoPago" },
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo", label: "Efectivo (al retirar)" },
];

export default function NuevoBorradorClient() {
  const router = useRouter();
  const [items, setItems] = useState<PedidoBorradorItem[]>([]);

  // Datos generales
  const [notas, setNotas] = useState("");
  const [tipoDescuento, setTipoDescuento] = useState<"ninguno" | "monto" | "porcentaje">("ninguno");
  const [descuentoMonto, setDescuentoMonto] = useState(0);
  const [descuentoPct, setDescuentoPct] = useState(0);

  // Envío
  const [tipoEnvio, setTipoEnvio] = useState<"cotizar" | "fijo" | "gratis">("cotizar");
  const [costoEnvioFijo, setCostoEnvioFijo] = useState(0);

  // Métodos de pago
  const [restringirPago, setRestringirPago] = useState(false);
  const [metodosPagoElegidos, setMetodosPagoElegidos] = useState<MetodoPago[]>([
    "mercadopago",
    "transferencia",
    "efectivo",
  ]);

  // Paquete override
  const [overridePaquete, setOverridePaquete] = useState(false);
  const [pkgPeso, setPkgPeso] = useState(500);
  const [pkgAlto, setPkgAlto] = useState(15);
  const [pkgAncho, setPkgAncho] = useState(15);
  const [pkgLargo, setPkgLargo] = useState(10);

  // Expiración
  const [expiracionHoras, setExpiracionHoras] = useState(DEFAULT_EXPIRACION_HORAS);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Totales calculados
  const subtotal = calculateSubtotal(items);
  const descuento = calculateDescuento(
    subtotal,
    tipoDescuento === "monto" ? descuentoMonto : 0,
    tipoDescuento === "porcentaje" ? descuentoPct : 0
  );
  const totalEstimado = subtotal - descuento;

  function addCustomItem() {
    setItems([
      ...items,
      {
        producto_id: null,
        sku: null,
        nombre: "",
        cantidad: 1,
        precio_unitario: 0,
      },
    ]);
  }

  function addCatalogoItem(p: ProductoBuscado) {
    setItems([
      ...items,
      {
        producto_id: p.id,
        sku: p.sku,
        nombre: p.nombre,
        cantidad: 1,
        precio_unitario: p.precio_oferta ?? p.precio,
        peso_gr: p.peso_gr ?? undefined,
        alto_cm: p.alto_cm ?? undefined,
        ancho_cm: p.ancho_cm ?? undefined,
        largo_cm: p.largo_cm ?? undefined,
      },
    ]);
  }

  function updateItem(idx: number, patch: Partial<PedidoBorradorItem>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  async function submit() {
    setError(null);

    if (items.length === 0) {
      setError("Tenés que agregar al menos un item");
      return;
    }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.nombre.trim()) {
        setError(`Item ${i + 1}: ingresá un nombre`);
        return;
      }
      if (it.cantidad < 1) {
        setError(`Item ${i + 1}: la cantidad debe ser ≥ 1`);
        return;
      }
      if (it.precio_unitario < 0) {
        setError(`Item ${i + 1}: el precio no puede ser negativo`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const body = {
        notas_admin: notas.trim() || undefined,
        items,
        descuento_monto: tipoDescuento === "monto" ? descuentoMonto : 0,
        descuento_porcentaje: tipoDescuento === "porcentaje" ? descuentoPct : 0,
        envio_gratis: tipoEnvio === "gratis",
        costo_envio_override: tipoEnvio === "fijo" ? costoEnvioFijo : null,
        metodos_pago_permitidos: restringirPago ? metodosPagoElegidos : null,
        paquete_peso_gr: overridePaquete ? pkgPeso : null,
        paquete_alto_cm: overridePaquete ? pkgAlto : null,
        paquete_ancho_cm: overridePaquete ? pkgAncho : null,
        paquete_largo_cm: overridePaquete ? pkgLargo : null,
        expiracion_horas: expiracionHoras,
      };

      const res = await fetch("/api/admin/borradores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al crear el borrador");
        return;
      }
      router.push(`/admin/borradores/${data.borrador.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">
            Nuevo borrador
          </h1>
          <p className="text-sm text-lavanda/60 mt-0.5">
            Generás un link único para compartir al cliente
          </p>
        </div>
        <Link
          href="/admin/borradores"
          className="text-sm text-lavanda hover:text-niebla transition-colors"
        >
          ← Volver
        </Link>
      </div>

      {/* Items */}
      <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-niebla">Items</h2>
          <div className="flex gap-2">
            <BuscarCatalogoButton onPick={addCatalogoItem} />
            <button
              onClick={addCustomItem}
              className="px-3 py-1.5 bg-lavanda/10 hover:bg-lavanda/20 text-lavanda-light text-sm rounded-lg transition-colors"
            >
              + Item custom
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-lavanda/40 text-center py-6">
            Agregá items del catálogo o creá items custom
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((it, idx) => (
              <ItemEditor
                key={idx}
                item={it}
                onChange={(patch) => updateItem(idx, patch)}
                onRemove={() => removeItem(idx)}
                index={idx}
              />
            ))}
          </div>
        )}
      </section>

      {/* Descuento */}
      <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-niebla">Descuento</h2>
        <div className="flex gap-2 flex-wrap">
          {(["ninguno", "monto", "porcentaje"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipoDescuento(t)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                tipoDescuento === t
                  ? "border-purpura bg-purpura/20 text-ambar"
                  : "border-lavanda/10 text-lavanda hover:bg-lavanda/5"
              }`}
            >
              {t === "ninguno" ? "Sin descuento" : t === "monto" ? "Monto fijo" : "Porcentaje"}
            </button>
          ))}
        </div>
        {tipoDescuento === "monto" && (
          <div>
            <label className="text-xs text-lavanda/60">Monto a descontar ($)</label>
            <input
              type="number"
              min={0}
              value={descuentoMonto || ""}
              onChange={(e) => setDescuentoMonto(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
            />
          </div>
        )}
        {tipoDescuento === "porcentaje" && (
          <div>
            <label className="text-xs text-lavanda/60">Porcentaje (0-100)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={descuentoPct || ""}
              onChange={(e) => setDescuentoPct(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
            />
          </div>
        )}
      </section>

      {/* Envío */}
      <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-niebla">Envío</h2>
        <div className="flex gap-2 flex-wrap">
          {(["cotizar", "fijo", "gratis"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTipoEnvio(t)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                tipoEnvio === t
                  ? "border-purpura bg-purpura/20 text-ambar"
                  : "border-lavanda/10 text-lavanda hover:bg-lavanda/5"
              }`}
            >
              {t === "cotizar"
                ? "Cotizar normal"
                : t === "fijo"
                ? "Monto fijo"
                : "Envío gratis"}
            </button>
          ))}
        </div>
        {tipoEnvio === "fijo" && (
          <div>
            <label className="text-xs text-lavanda/60">Costo de envío ($)</label>
            <input
              type="number"
              min={0}
              value={costoEnvioFijo || ""}
              onChange={(e) => setCostoEnvioFijo(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
            />
          </div>
        )}
      </section>

      {/* Métodos de pago */}
      <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={restringirPago}
            onChange={(e) => setRestringirPago(e.target.checked)}
            className="accent-purpura"
          />
          <span className="text-sm text-niebla">
            Restringir métodos de pago para este borrador
          </span>
        </label>
        {restringirPago && (
          <div className="flex gap-2 flex-wrap pl-6">
            {METODOS_PAGO.map((mp) => {
              const checked = metodosPagoElegidos.includes(mp.value);
              return (
                <label
                  key={mp.value}
                  className="flex items-center gap-2 px-3 py-1.5 bg-navy-deep rounded-lg border border-lavanda/10 cursor-pointer text-sm text-lavanda-light"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setMetodosPagoElegidos([...metodosPagoElegidos, mp.value]);
                      } else {
                        setMetodosPagoElegidos(
                          metodosPagoElegidos.filter((m) => m !== mp.value)
                        );
                      }
                    }}
                    className="accent-purpura"
                  />
                  {mp.label}
                </label>
              );
            })}
          </div>
        )}
      </section>

      {/* Override paquete */}
      <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={overridePaquete}
            onChange={(e) => setOverridePaquete(e.target.checked)}
            className="accent-purpura"
          />
          <span className="text-sm text-niebla">
            Definir dimensiones del paquete (sobreescribe la suma de items)
          </span>
        </label>
        {overridePaquete && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pl-6">
            <div>
              <label className="text-xs text-lavanda/60">Peso (g)</label>
              <input
                type="number"
                min={1}
                value={pkgPeso}
                onChange={(e) => setPkgPeso(Number(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
              />
            </div>
            <div>
              <label className="text-xs text-lavanda/60">Alto (cm)</label>
              <input
                type="number"
                min={1}
                value={pkgAlto}
                onChange={(e) => setPkgAlto(Number(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
              />
            </div>
            <div>
              <label className="text-xs text-lavanda/60">Ancho (cm)</label>
              <input
                type="number"
                min={1}
                value={pkgAncho}
                onChange={(e) => setPkgAncho(Number(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
              />
            </div>
            <div>
              <label className="text-xs text-lavanda/60">Largo (cm)</label>
              <input
                type="number"
                min={1}
                value={pkgLargo}
                onChange={(e) => setPkgLargo(Number(e.target.value) || 0)}
                className="w-full px-2 py-1.5 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
              />
            </div>
          </div>
        )}
      </section>

      {/* Notas + Expiración */}
      <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-niebla">Configuración</h2>
        <div>
          <label className="text-xs text-lavanda/60">Notas internas (no las ve el cliente)</label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows={2}
            placeholder="Mayorista Juan, descuento por compra de varios, etc."
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light placeholder-lavanda/30 focus:outline-none focus:border-purpura resize-none"
          />
        </div>
        <div>
          <label className="text-xs text-lavanda/60">Expira en (horas)</label>
          <input
            type="number"
            min={1}
            value={expiracionHoras}
            onChange={(e) => setExpiracionHoras(Number(e.target.value) || DEFAULT_EXPIRACION_HORAS)}
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
          />
          <p className="text-xs text-lavanda/40 mt-1">
            Default {DEFAULT_EXPIRACION_HORAS}h. Para mayoristas que necesitan más tiempo, subilo (ej: 168 = 7 días).
          </p>
        </div>
      </section>

      {/* Resumen */}
      <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-2">
        <h2 className="text-sm font-semibold text-niebla">Resumen</h2>
        <div className="text-sm space-y-1">
          <div className="flex justify-between text-lavanda">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {descuento > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>Descuento</span>
              <span>−{formatPrice(descuento)}</span>
            </div>
          )}
          <div className="flex justify-between text-niebla font-semibold pt-1 border-t border-lavanda/10">
            <span>Total estimado (sin envío)</span>
            <span className="text-ambar">{formatPrice(totalEstimado)}</span>
          </div>
        </div>
      </section>

      {error && (
        <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/admin/borradores"
          className="px-4 py-2 text-sm text-lavanda hover:text-niebla transition-colors"
        >
          Cancelar
        </Link>
        <button
          onClick={submit}
          disabled={submitting || items.length === 0}
          className="flex-1 py-2.5 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Generando..." : "Generar borrador y obtener link"}
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Item editor row
// ----------------------------------------------------------------
function ItemEditor({
  item,
  onChange,
  onRemove,
  index,
}: {
  item: PedidoBorradorItem;
  onChange: (patch: Partial<PedidoBorradorItem>) => void;
  onRemove: () => void;
  index: number;
}) {
  const [showDimensiones, setShowDimensiones] = useState(false);
  const isCatalogo = Boolean(item.producto_id);

  return (
    <div className="bg-navy-deep rounded-lg border border-lavanda/10 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-lavanda/40">
            <span>Item {index + 1}</span>
            {isCatalogo ? (
              <span className="px-1.5 py-0.5 bg-emerald-400/10 text-emerald-400 rounded text-[10px]">
                CATÁLOGO {item.sku ? `· ${item.sku}` : ""}
              </span>
            ) : (
              <span className="px-1.5 py-0.5 bg-ambar/10 text-ambar rounded text-[10px]">
                CUSTOM
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Quitar
        </button>
      </div>

      <input
        type="text"
        value={item.nombre}
        onChange={(e) => onChange({ nombre: e.target.value })}
        placeholder="Nombre del producto"
        className="w-full px-3 py-2 bg-navy border border-lavanda/20 rounded-lg text-sm text-lavanda-light placeholder-lavanda/30 focus:outline-none focus:border-purpura"
      />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-lavanda/60">Cantidad</label>
          <input
            type="number"
            min={1}
            value={item.cantidad}
            onChange={(e) => onChange({ cantidad: Math.max(1, Number(e.target.value) || 1) })}
            className="w-full px-2 py-1.5 bg-navy border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
          />
        </div>
        <div>
          <label className="text-xs text-lavanda/60">Precio unitario ($)</label>
          <input
            type="number"
            min={0}
            value={item.precio_unitario}
            onChange={(e) => onChange({ precio_unitario: Number(e.target.value) || 0 })}
            className="w-full px-2 py-1.5 bg-navy border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
          />
        </div>
      </div>

      {!isCatalogo && (
        <div>
          <label className="text-xs text-lavanda/60">Imagen URL (opcional, se muestra al cliente)</label>
          <input
            type="url"
            value={item.imagen_url || ""}
            onChange={(e) => onChange({ imagen_url: e.target.value || undefined })}
            placeholder="https://..."
            className="w-full px-3 py-1.5 bg-navy border border-lavanda/20 rounded-lg text-sm text-lavanda-light placeholder-lavanda/30 focus:outline-none focus:border-purpura"
          />
        </div>
      )}

      <button
        onClick={() => setShowDimensiones((s) => !s)}
        className="text-xs text-lavanda/60 hover:text-lavanda transition-colors"
      >
        {showDimensiones ? "▼" : "▶"} Dimensiones {isCatalogo ? "(traídas del catálogo)" : "(opcional, defaults: 500g · 15×15×10)"}
      </button>

      {showDimensiones && (
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] text-lavanda/40">Peso (g)</label>
            <input
              type="number"
              min={1}
              value={item.peso_gr || ""}
              onChange={(e) => onChange({ peso_gr: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-2 py-1 bg-navy border border-lavanda/20 rounded text-xs text-lavanda-light focus:outline-none focus:border-purpura"
            />
          </div>
          <div>
            <label className="text-[10px] text-lavanda/40">Alto (cm)</label>
            <input
              type="number"
              min={1}
              value={item.alto_cm || ""}
              onChange={(e) => onChange({ alto_cm: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-2 py-1 bg-navy border border-lavanda/20 rounded text-xs text-lavanda-light focus:outline-none focus:border-purpura"
            />
          </div>
          <div>
            <label className="text-[10px] text-lavanda/40">Ancho (cm)</label>
            <input
              type="number"
              min={1}
              value={item.ancho_cm || ""}
              onChange={(e) => onChange({ ancho_cm: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-2 py-1 bg-navy border border-lavanda/20 rounded text-xs text-lavanda-light focus:outline-none focus:border-purpura"
            />
          </div>
          <div>
            <label className="text-[10px] text-lavanda/40">Largo (cm)</label>
            <input
              type="number"
              min={1}
              value={item.largo_cm || ""}
              onChange={(e) => onChange({ largo_cm: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-2 py-1 bg-navy border border-lavanda/20 rounded text-xs text-lavanda-light focus:outline-none focus:border-purpura"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------
// Buscador de catálogo
// ----------------------------------------------------------------
function BuscarCatalogoButton({ onPick }: { onPick: (p: ProductoBuscado) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductoBuscado[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
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
          .select("id, nombre, sku, precio, precio_oferta, peso_gr, alto_cm, ancho_cm, largo_cm")
          .eq("activo", true)
          .ilike("nombre", `%${query}%`)
          .limit(15);
        if (!ctrl.signal.aborted) setResults((data as ProductoBuscado[]) || []);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query, open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 bg-purpura/20 hover:bg-purpura/30 text-purpura text-sm rounded-lg transition-colors"
      >
        + Del catálogo
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 bg-black/60"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-navy rounded-xl border border-lavanda/20 w-full max-w-lg max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b border-lavanda/10">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar producto por nombre..."
                className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light placeholder-lavanda/30 focus:outline-none focus:border-purpura"
              />
            </div>
            <div className="flex-1 overflow-auto">
              {loading && <p className="p-4 text-sm text-lavanda/40">Buscando...</p>}
              {!loading && query && results.length === 0 && (
                <p className="p-4 text-sm text-lavanda/40">Sin resultados</p>
              )}
              {!loading && !query && (
                <p className="p-4 text-sm text-lavanda/40">Escribí para buscar</p>
              )}
              <div className="divide-y divide-lavanda/5">
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      onPick(r);
                      setOpen(false);
                      setQuery("");
                      setResults([]);
                    }}
                    className="w-full text-left p-3 hover:bg-lavanda/5 transition-colors"
                  >
                    <p className="text-sm text-niebla">{r.nombre}</p>
                    <p className="text-xs text-lavanda/60">
                      {r.sku ? `${r.sku} · ` : ""}
                      {formatPrice(r.precio_oferta ?? r.precio)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
