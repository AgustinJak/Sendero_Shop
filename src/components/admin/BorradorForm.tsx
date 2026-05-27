"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { formatPrice } from "@/lib/utils";
import {
  calculateSubtotal,
  calculateDescuento,
  calculateSena,
  DEFAULT_EXPIRACION_HORAS,
} from "@/lib/borrador";
import type {
  PedidoBorrador,
  PedidoBorradorItem,
  MetodoPago,
  SenaTipo,
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

interface Props {
  /** Si se pasa, el form arranca en modo "edit". Si no, modo "create". */
  initialData?: PedidoBorrador;
}

/**
 * Normaliza imágenes de un item para edición: convierte el viejo `imagen_url`
 * en `imagenes_url[0]` para que el form solo trabaje con el array.
 */
function normalizeItemForEdit(item: PedidoBorradorItem): PedidoBorradorItem {
  if (item.imagenes_url && item.imagenes_url.length > 0) return item;
  if (item.imagen_url) {
    return { ...item, imagenes_url: [item.imagen_url], imagen_url: undefined };
  }
  return item;
}

export default function BorradorForm({ initialData }: Props) {
  const router = useRouter();
  const isEdit = Boolean(initialData);

  // ────────── State (pre-poblado si edit) ──────────
  const [items, setItems] = useState<PedidoBorradorItem[]>(
    initialData?.items.map(normalizeItemForEdit) ?? []
  );

  const [notas, setNotas] = useState(initialData?.notas_admin ?? "");

  // Descuento
  const initialTipoDescuento: "ninguno" | "monto" | "porcentaje" =
    initialData && Number(initialData.descuento_monto) > 0
      ? "monto"
      : initialData && Number(initialData.descuento_porcentaje) > 0
      ? "porcentaje"
      : "ninguno";
  const [tipoDescuento, setTipoDescuento] = useState<"ninguno" | "monto" | "porcentaje">(initialTipoDescuento);
  const [descuentoMonto, setDescuentoMonto] = useState(Number(initialData?.descuento_monto ?? 0));
  const [descuentoPct, setDescuentoPct] = useState(Number(initialData?.descuento_porcentaje ?? 0));

  // Envío
  const initialTipoEnvio: "cotizar" | "fijo" | "gratis" = initialData?.envio_gratis
    ? "gratis"
    : initialData?.costo_envio_override !== null && initialData?.costo_envio_override !== undefined
    ? "fijo"
    : "cotizar";
  const [tipoEnvio, setTipoEnvio] = useState<"cotizar" | "fijo" | "gratis">(initialTipoEnvio);
  const [costoEnvioFijo, setCostoEnvioFijo] = useState(
    initialData?.costo_envio_override ? Number(initialData.costo_envio_override) : 0
  );

  // Métodos de pago
  const [restringirPago, setRestringirPago] = useState(
    Boolean(initialData?.metodos_pago_permitidos)
  );
  const [metodosPagoElegidos, setMetodosPagoElegidos] = useState<MetodoPago[]>(
    initialData?.metodos_pago_permitidos ?? ["mercadopago", "transferencia", "efectivo"]
  );

  // Paquete override
  const initialOverride = Boolean(
    initialData?.paquete_peso_gr &&
      initialData?.paquete_alto_cm &&
      initialData?.paquete_ancho_cm &&
      initialData?.paquete_largo_cm
  );
  const [overridePaquete, setOverridePaquete] = useState(initialOverride);
  const [pkgPeso, setPkgPeso] = useState(initialData?.paquete_peso_gr ?? 500);
  const [pkgAlto, setPkgAlto] = useState(initialData?.paquete_alto_cm ?? 15);
  const [pkgAncho, setPkgAncho] = useState(initialData?.paquete_ancho_cm ?? 15);
  const [pkgLargo, setPkgLargo] = useState(initialData?.paquete_largo_cm ?? 10);

  // Seña
  const [tipoSena, setTipoSena] = useState<"ninguna" | SenaTipo>(
    (initialData?.sena_tipo as SenaTipo | null) ?? "ninguna"
  );
  const [senaPct, setSenaPct] = useState(
    initialData?.sena_tipo === "porcentaje" ? Number(initialData.sena_valor) : 30
  );
  const [senaMonto, setSenaMonto] = useState(
    initialData?.sena_tipo === "monto_fijo" ? Number(initialData.sena_valor) : 0
  );

  // Expiración
  const [expiracionHoras, setExpiracionHoras] = useState(DEFAULT_EXPIRACION_HORAS);
  const [resetearExpiracion, setResetearExpiracion] = useState(false);

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
  const senaPreview = calculateSena(
    totalEstimado,
    tipoSena === "ninguna" ? null : tipoSena,
    tipoSena === "porcentaje" ? senaPct : tipoSena === "monto_fijo" ? senaMonto : null
  );

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

    if (tipoSena === "porcentaje" && (senaPct < 10 || senaPct > 90)) {
      setError("La seña en porcentaje tiene que estar entre 10% y 90%");
      return;
    }
    if (tipoSena === "monto_fijo" && senaMonto <= 0) {
      setError("La seña en monto fijo tiene que ser positiva");
      return;
    }

    setSubmitting(true);
    try {
      // Limpiar imagenes_url vacías antes de mandar
      const cleanItems = items.map((it) => ({
        ...it,
        imagenes_url:
          it.imagenes_url && it.imagenes_url.filter((u) => u.trim()).length > 0
            ? it.imagenes_url.filter((u) => u.trim())
            : undefined,
        imagen_url: undefined, // siempre usamos imagenes_url ahora
      }));

      const body: Record<string, unknown> = {
        notas_admin: notas.trim() || undefined,
        items: cleanItems,
        descuento_monto: tipoDescuento === "monto" ? descuentoMonto : 0,
        descuento_porcentaje: tipoDescuento === "porcentaje" ? descuentoPct : 0,
        envio_gratis: tipoEnvio === "gratis",
        costo_envio_override: tipoEnvio === "fijo" ? costoEnvioFijo : null,
        metodos_pago_permitidos: restringirPago ? metodosPagoElegidos : null,
        paquete_peso_gr: overridePaquete ? pkgPeso : null,
        paquete_alto_cm: overridePaquete ? pkgAlto : null,
        paquete_ancho_cm: overridePaquete ? pkgAncho : null,
        paquete_largo_cm: overridePaquete ? pkgLargo : null,
        sena_tipo: tipoSena === "ninguna" ? null : tipoSena,
        sena_valor:
          tipoSena === "porcentaje"
            ? senaPct
            : tipoSena === "monto_fijo"
            ? senaMonto
            : null,
      };

      // En edit mode: solo mandar expiracion_horas si el admin quiso resetearla
      if (!isEdit || resetearExpiracion) {
        body.expiracion_horas = expiracionHoras;
      }

      const url = isEdit
        ? `/api/admin/borradores/${initialData!.id}`
        : "/api/admin/borradores";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Error al ${isEdit ? "guardar" : "crear"} el borrador`);
        return;
      }
      const borradorId = isEdit ? initialData!.id : data.borrador.id;
      router.push(`/admin/borradores/${borradorId}`);
      router.refresh();
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
            {isEdit ? "Editar borrador" : "Nuevo borrador"}
          </h1>
          <p className="text-sm text-lavanda/60 mt-0.5">
            {isEdit
              ? "Los cambios son inmediatos. Si el cliente tiene el link abierto verá los cambios al refrescar."
              : "Generás un link único para compartir al cliente"}
          </p>
        </div>
        <Link
          href={isEdit ? `/admin/borradores/${initialData!.id}` : "/admin/borradores"}
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

      {/* Seña */}
      <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-niebla">Seña / anticipo</h2>
          <p className="text-xs text-lavanda/50 mt-0.5">
            El cliente paga la seña ahora (MP o transferencia). El saldo se cobra al entregar/retirar.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(
            [
              { v: "ninguna", label: "Sin seña" },
              { v: "porcentaje", label: "Porcentaje" },
              { v: "monto_fijo", label: "Monto fijo" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setTipoSena(opt.v)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                tipoSena === opt.v
                  ? "border-purpura bg-purpura/20 text-ambar"
                  : "border-lavanda/10 text-lavanda hover:bg-lavanda/5"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {tipoSena === "porcentaje" && (
          <div>
            <label className="text-xs text-lavanda/60">Porcentaje (10-90)</label>
            <input
              type="number"
              min={10}
              max={90}
              value={senaPct}
              onChange={(e) => setSenaPct(Number(e.target.value) || 30)}
              className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
            />
          </div>
        )}
        {tipoSena === "monto_fijo" && (
          <div>
            <label className="text-xs text-lavanda/60">Monto fijo de la seña ($)</label>
            <input
              type="number"
              min={1}
              value={senaMonto || ""}
              onChange={(e) => setSenaMonto(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
            />
          </div>
        )}
        {senaPreview !== null && senaPreview > 0 && totalEstimado > 0 && (
          <div className="bg-purpura/10 border border-purpura/30 rounded-lg p-3 text-xs space-y-1">
            <p className="text-lavanda">
              La seña se calcula sobre el subtotal del pedido (sin envío). El saldo absorbe el costo del envío al entregar.
            </p>
            <div className="flex justify-between text-niebla pt-1">
              <span>Seña a cobrar ahora</span>
              <span className="font-medium text-ambar">{formatPrice(senaPreview)}</span>
            </div>
            <div className="flex justify-between text-lavanda-light">
              <span>Resto del subtotal a cobrar al entregar (+ envío)</span>
              <span>{formatPrice(totalEstimado - senaPreview)}</span>
            </div>
          </div>
        )}
        {tipoSena !== "ninguna" && (
          <p className="text-xs text-amber-400/80">
            ⚠ Los pedidos con seña no permiten pago en efectivo (efectivo = pago todo al retirar, incompatible con anticipo).
          </p>
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

        {/* En edit: opción de resetear la expiración. En create: input directo. */}
        {isEdit ? (
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={resetearExpiracion}
                onChange={(e) => setResetearExpiracion(e.target.checked)}
                className="accent-purpura"
              />
              <span className="text-sm text-lavanda-light">
                Resetear expiración (cuenta nuevamente desde ahora)
              </span>
            </label>
            {resetearExpiracion && (
              <div>
                <label className="text-xs text-lavanda/60">Nueva expiración en (horas desde ahora)</label>
                <input
                  type="number"
                  min={1}
                  value={expiracionHoras}
                  onChange={(e) => setExpiracionHoras(Number(e.target.value) || DEFAULT_EXPIRACION_HORAS)}
                  className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
                />
              </div>
            )}
            {initialData && !resetearExpiracion && (
              <p className="text-xs text-lavanda/40">
                Expiración actual: {new Date(initialData.expires_at).toLocaleString("es-AR")}
              </p>
            )}
          </div>
        ) : (
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
        )}
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
          href={isEdit ? `/admin/borradores/${initialData!.id}` : "/admin/borradores"}
          className="px-4 py-2 text-sm text-lavanda hover:text-niebla transition-colors"
        >
          Cancelar
        </Link>
        <button
          onClick={submit}
          disabled={submitting || items.length === 0}
          className="flex-1 py-2.5 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? isEdit
              ? "Guardando..."
              : "Generando..."
            : isEdit
            ? "Guardar cambios"
            : "Generar borrador y obtener link"}
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Item editor row (con soporte de múltiples imágenes)
// ────────────────────────────────────────────────────────────────
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
  const imagenes = item.imagenes_url ?? [];

  function updateImagen(i: number, url: string) {
    const newImgs = [...imagenes];
    newImgs[i] = url;
    onChange({ imagenes_url: newImgs });
  }

  function removeImagen(i: number) {
    const newImgs = imagenes.filter((_, idx) => idx !== i);
    onChange({ imagenes_url: newImgs });
  }

  function addImagen() {
    onChange({ imagenes_url: [...imagenes, ""] });
  }

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
        <div className="space-y-1.5">
          <label className="text-xs text-lavanda/60">
            Imágenes (opcional, se muestran al cliente)
          </label>
          {imagenes.length === 0 && (
            <button
              type="button"
              onClick={addImagen}
              className="w-full px-3 py-1.5 bg-navy border border-dashed border-lavanda/20 rounded-lg text-xs text-lavanda/60 hover:text-lavanda hover:border-lavanda/40 transition-colors"
            >
              + Agregar imagen
            </button>
          )}
          {imagenes.map((url, i) => (
            <div key={i} className="flex gap-2 items-start">
              {url && (
                <img
                  src={url}
                  alt=""
                  className="w-10 h-10 rounded object-cover bg-navy border border-lavanda/10 shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <input
                type="url"
                value={url}
                onChange={(e) => updateImagen(i, e.target.value)}
                placeholder="https://..."
                className="flex-1 px-3 py-1.5 bg-navy border border-lavanda/20 rounded-lg text-sm text-lavanda-light placeholder-lavanda/30 focus:outline-none focus:border-purpura"
              />
              <button
                type="button"
                onClick={() => removeImagen(i)}
                className="px-2 py-1.5 text-red-400/60 hover:text-red-400 transition-colors text-sm"
                aria-label={`Quitar imagen ${i + 1}`}
              >
                ×
              </button>
            </div>
          ))}
          {imagenes.length > 0 && (
            <button
              type="button"
              onClick={addImagen}
              className="text-xs text-lavanda/60 hover:text-lavanda transition-colors"
            >
              + Agregar otra imagen
            </button>
          )}
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

// ────────────────────────────────────────────────────────────────
// Buscador de catálogo
// ────────────────────────────────────────────────────────────────
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
