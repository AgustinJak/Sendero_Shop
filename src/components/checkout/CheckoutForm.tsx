"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCartContext } from "@/components/carrito/CartProvider";
import { formatPrice, calcularRecargoMP, validarDNI } from "@/lib/utils";
import { trackBeginCheckout, trackPurchase } from "@/lib/analytics";
import type {
  CheckoutData,
  DatosPersonales,
  DireccionEnvio,
  MetodoEnvio,
  MetodoPago,
  EnvioZona,
} from "@/types";

interface CheckoutFormProps {
  zonas: EnvioZona[];
  configuracion: Record<string, string>;
}

type Step = "datos" | "envio" | "pago" | "resumen";

export default function CheckoutForm({ zonas, configuracion }: CheckoutFormProps) {
  const router = useRouter();
  const { cart, clearCart, itemCount } = useCartContext();
  const [step, setStep] = useState<Step>("datos");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const trackedCheckout = useRef(false);

  // Track begin_checkout once
  useEffect(() => {
    if (trackedCheckout.current || itemCount === 0) return;
    trackedCheckout.current = true;
    trackBeginCheckout(
      cart.items.map((i) => ({
        id: i.producto_id,
        name: i.nombre,
        price: i.precio_unitario,
        quantity: i.cantidad,
      })),
      cart.subtotal
    );
  }, [cart, itemCount]);

  // Form state
  const [datos, setDatos] = useState<DatosPersonales>({
    nombre_completo: "",
    dni: "",
    email: "",
    telefono: "",
  });

  const [metodoEnvio, setMetodoEnvio] = useState<MetodoEnvio>("correo_argentino");
  const [tipoEnvio, setTipoEnvio] = useState<"domicilio" | "sucursal">("domicilio");
  const [direccion, setDireccion] = useState<DireccionEnvio>({
    calle: "",
    numero: "",
    piso: "",
    departamento: "",
    codigo_postal: "",
    localidad: "",
    provincia: "",
  });

  const [metodoPago, setMetodoPago] = useState<MetodoPago>("transferencia");

  // Calcular costo de envío
  const zonaSeleccionada = zonas.find((z) =>
    z.provincias.some((p) => p.toLowerCase() === direccion.provincia.toLowerCase())
  );

  function getCostoEnvio(): number {
    if (metodoEnvio === "retiro") return 0;
    if (!zonaSeleccionada) return 0;

    if (metodoEnvio === "correo_argentino") {
      return tipoEnvio === "domicilio"
        ? zonaSeleccionada.correo_argentino_domicilio
        : zonaSeleccionada.correo_argentino_sucursal;
    }
    return tipoEnvio === "domicilio"
      ? zonaSeleccionada.andreani_domicilio
      : zonaSeleccionada.andreani_sucursal;
  }

  const costoEnvio = getCostoEnvio();
  const recargoMP = metodoPago === "mercadopago" ? calcularRecargoMP(cart.subtotal + costoEnvio) : 0;
  const total = cart.subtotal + costoEnvio + recargoMP;

  // Validaciones
  function validarDatos(): string | null {
    if (!datos.nombre_completo.trim()) return "Ingresá tu nombre completo";
    if (!datos.dni.trim() || !validarDNI(datos.dni)) return "DNI inválido (7-8 dígitos)";
    if (!datos.email.trim() || !datos.email.includes("@")) return "Email inválido";
    if (!datos.telefono.trim()) return "Ingresá tu teléfono";
    return null;
  }

  function validarEnvio(): string | null {
    if (metodoEnvio === "retiro") return null;
    if (!direccion.calle.trim()) return "Ingresá la calle";
    if (!direccion.numero.trim()) return "Ingresá el número";
    if (!direccion.codigo_postal.trim()) return "Ingresá el código postal";
    if (!direccion.localidad.trim()) return "Ingresá la localidad";
    if (!direccion.provincia.trim()) return "Seleccioná la provincia";
    if (!zonaSeleccionada) return "No tenemos envío a esa provincia";
    return null;
  }

  function nextStep() {
    setError("");
    if (step === "datos") {
      const err = validarDatos();
      if (err) { setError(err); return; }
      setStep("envio");
    } else if (step === "envio") {
      const err = validarEnvio();
      if (err) { setError(err); return; }
      setStep("pago");
    } else if (step === "pago") {
      setStep("resumen");
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");

    try {
      const body: CheckoutData & { items: typeof cart.items; costoEnvio: number; recargoMP: number; subtotal: number; total: number } = {
        datos_personales: datos,
        metodo_envio: metodoEnvio,
        direccion_envio: metodoEnvio === "retiro" ? null : direccion,
        metodo_pago: metodoPago,
        items: cart.items,
        costoEnvio,
        recargoMP,
        subtotal: cart.subtotal,
        total,
      };

      const res = await fetch("/api/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "Error al crear el pedido");
        setLoading(false);
        return;
      }

      // If MercadoPago, redirect to MP checkout
      if (metodoPago === "mercadopago") {
        const mpRes = await fetch("/api/mercadopago/create-preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pedido_id: result.id }),
        });

        const mpData = await mpRes.json();

        if (!mpRes.ok || !mpData.init_point) {
          setError("Error al conectar con MercadoPago. Podés reintentar desde tu pedido.");
          clearCart();
          router.push(`/pedido/${result.id}`);
          return;
        }

        trackPurchase({
          id: result.id,
          total,
          shipping: costoEnvio,
          items: cart.items.map((i) => ({
            id: i.producto_id,
            name: i.nombre,
            price: i.precio_unitario,
            quantity: i.cantidad,
          })),
        });
        clearCart();
        window.location.href = mpData.init_point;
        return;
      }

      trackPurchase({
        id: result.id,
        total,
        shipping: costoEnvio,
        items: cart.items.map((i) => ({
          id: i.producto_id,
          name: i.nombre,
          price: i.precio_unitario,
          quantity: i.cantidad,
        })),
      });
      clearCart();
      router.push(`/pedido/${result.id}`);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
      setLoading(false);
    }
  }

  if (itemCount === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lavanda/60 text-lg">Tu carrito está vacío</p>
        <a href="/catalogo" className="text-ambar hover:text-ambar-light mt-4 inline-block">
          Ir al catálogo
        </a>
      </div>
    );
  }

  const PROVINCIAS = [
    "CABA", "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
    "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones",
    "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz",
    "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Formulario */}
      <div className="lg:col-span-2 space-y-6">
        {/* Steps indicator */}
        <div className="flex gap-2 text-xs text-lavanda/40">
          {(["datos", "envio", "pago", "resumen"] as Step[]).map((s, i) => (
            <button
              key={s}
              onClick={() => {
                const steps: Step[] = ["datos", "envio", "pago", "resumen"];
                if (steps.indexOf(s) < steps.indexOf(step)) setStep(s);
              }}
              className={`px-3 py-1 rounded-full transition-colors ${
                step === s
                  ? "bg-purpura text-niebla"
                  : "bg-navy-deep border border-lavanda/10 hover:border-lavanda/20"
              }`}
            >
              {i + 1}. {s === "datos" ? "Datos" : s === "envio" ? "Envío" : s === "pago" ? "Pago" : "Confirmar"}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* PASO 1: Datos */}
        {step === "datos" && (
          <section className="bg-navy-deep rounded-xl border border-lavanda/10 p-6 space-y-4">
            <h2 className="font-[family-name:var(--font-cinzel)] text-lg font-bold text-niebla">
              Datos personales
            </h2>
            <Input label="Nombre completo" value={datos.nombre_completo} onChange={(v) => setDatos({ ...datos, nombre_completo: v })} />
            <Input label="DNI" value={datos.dni} onChange={(v) => setDatos({ ...datos, dni: v })} type="tel" placeholder="12345678" />
            <Input label="Email" value={datos.email} onChange={(v) => setDatos({ ...datos, email: v })} type="email" />
            <Input label="Teléfono (WhatsApp)" value={datos.telefono} onChange={(v) => setDatos({ ...datos, telefono: v })} type="tel" placeholder="1125502785" />
            <button onClick={nextStep} className="w-full py-3 bg-purpura hover:bg-purpura/80 text-niebla font-semibold rounded-lg transition-colors">
              Continuar
            </button>
          </section>
        )}

        {/* PASO 2: Envío */}
        {step === "envio" && (
          <section className="bg-navy-deep rounded-xl border border-lavanda/10 p-6 space-y-4">
            <h2 className="font-[family-name:var(--font-cinzel)] text-lg font-bold text-niebla">
              Método de envío
            </h2>

            <div className="space-y-2">
              {([
                { value: "retiro" as MetodoEnvio, label: "Retiro en persona", desc: "Villa Crespo, CABA — Gratis" },
                { value: "correo_argentino" as MetodoEnvio, label: "Correo Argentino", desc: "3-7 días hábiles" },
              ]).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    metodoEnvio === opt.value
                      ? "border-purpura bg-purpura/10"
                      : "border-lavanda/10 hover:border-lavanda/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="envio"
                    checked={metodoEnvio === opt.value}
                    onChange={() => setMetodoEnvio(opt.value)}
                    className="accent-purpura"
                  />
                  <div>
                    <p className="text-sm font-medium text-niebla">{opt.label}</p>
                    <p className="text-xs text-lavanda/50">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {metodoEnvio !== "retiro" && (
              <>
                {/* Tipo: domicilio o sucursal */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setTipoEnvio("domicilio")}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                      tipoEnvio === "domicilio" ? "border-purpura bg-purpura/10 text-niebla" : "border-lavanda/10 text-lavanda-light"
                    }`}
                  >
                    A domicilio
                  </button>
                  <button
                    onClick={() => setTipoEnvio("sucursal")}
                    className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                      tipoEnvio === "sucursal" ? "border-purpura bg-purpura/10 text-niebla" : "border-lavanda/10 text-lavanda-light"
                    }`}
                  >
                    A sucursal
                  </button>
                </div>

                {/* Dirección */}
                <div className="space-y-3">
                  <select
                    value={direccion.provincia}
                    onChange={(e) => setDireccion({ ...direccion, provincia: e.target.value })}
                    className="w-full bg-navy border border-lavanda/20 rounded-lg px-4 py-3 text-sm text-niebla focus:outline-none focus:border-purpura"
                  >
                    <option value="">Provincia *</option>
                    {PROVINCIAS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <Input label="Calle" value={direccion.calle} onChange={(v) => setDireccion({ ...direccion, calle: v })} />
                    </div>
                    <Input label="Número" value={direccion.numero} onChange={(v) => setDireccion({ ...direccion, numero: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Piso (opc.)" value={direccion.piso} onChange={(v) => setDireccion({ ...direccion, piso: v })} />
                    <Input label="Depto (opc.)" value={direccion.departamento} onChange={(v) => setDireccion({ ...direccion, departamento: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Código Postal" value={direccion.codigo_postal} onChange={(v) => setDireccion({ ...direccion, codigo_postal: v })} />
                    <Input label="Localidad" value={direccion.localidad} onChange={(v) => setDireccion({ ...direccion, localidad: v })} />
                  </div>
                </div>

                {zonaSeleccionada && (
                  <p className="text-sm text-lavanda-light">
                    Costo de envío: <span className="font-semibold text-ambar">{formatPrice(costoEnvio)}</span>
                  </p>
                )}
              </>
            )}

            <button onClick={nextStep} className="w-full py-3 bg-purpura hover:bg-purpura/80 text-niebla font-semibold rounded-lg transition-colors">
              Continuar
            </button>
          </section>
        )}

        {/* PASO 3: Pago */}
        {step === "pago" && (
          <section className="bg-navy-deep rounded-xl border border-lavanda/10 p-6 space-y-4">
            <h2 className="font-[family-name:var(--font-cinzel)] text-lg font-bold text-niebla">
              Método de pago
            </h2>

            <div className="space-y-2">
              <label
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  metodoPago === "transferencia" ? "border-purpura bg-purpura/10" : "border-lavanda/10 hover:border-lavanda/20"
                }`}
              >
                <input type="radio" name="pago" checked={metodoPago === "transferencia"} onChange={() => setMetodoPago("transferencia")} className="accent-purpura" />
                <div>
                  <p className="text-sm font-medium text-niebla">Transferencia bancaria</p>
                  <p className="text-xs text-lavanda/50">Sin recargo. 48hs para enviar comprobante.</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  metodoPago === "mercadopago" ? "border-purpura bg-purpura/10" : "border-lavanda/10 hover:border-lavanda/20"
                }`}
              >
                <input type="radio" name="pago" checked={metodoPago === "mercadopago"} onChange={() => setMetodoPago("mercadopago")} className="accent-purpura" />
                <div>
                  <p className="text-sm font-medium text-niebla">MercadoPago</p>
                  <p className="text-xs text-lavanda/50">Tarjeta, dinero en cuenta, Rapipago. +13% recargo.</p>
                </div>
              </label>

              {metodoEnvio === "retiro" && (
                <label
                  className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                    metodoPago === "efectivo" ? "border-purpura bg-purpura/10" : "border-lavanda/10 hover:border-lavanda/20"
                  }`}
                >
                  <input type="radio" name="pago" checked={metodoPago === "efectivo"} onChange={() => setMetodoPago("efectivo")} className="accent-purpura" />
                  <div>
                    <p className="text-sm font-medium text-niebla">Efectivo</p>
                    <p className="text-xs text-lavanda/50">Pagás al retirar. Sin recargo.</p>
                  </div>
                </label>
              )}
            </div>

            {metodoPago === "mercadopago" && (
              <div className="bg-ambar/10 border border-ambar/20 rounded-lg px-4 py-3 text-sm text-ambar-light">
                Recargo MercadoPago (13%): {formatPrice(recargoMP)}
              </div>
            )}

            <button onClick={nextStep} className="w-full py-3 bg-purpura hover:bg-purpura/80 text-niebla font-semibold rounded-lg transition-colors">
              Revisar pedido
            </button>
          </section>
        )}

        {/* PASO 4: Resumen */}
        {step === "resumen" && (
          <section className="bg-navy-deep rounded-xl border border-lavanda/10 p-6 space-y-6">
            <h2 className="font-[family-name:var(--font-cinzel)] text-lg font-bold text-niebla">
              Confirmar pedido
            </h2>

            <div className="space-y-3 text-sm">
              <SummaryRow label="Nombre" value={datos.nombre_completo} />
              <SummaryRow label="DNI" value={datos.dni} />
              <SummaryRow label="Email" value={datos.email} />
              <SummaryRow label="Teléfono" value={datos.telefono} />
              <div className="border-t border-lavanda/10 my-2" />
              <SummaryRow label="Envío" value={
                metodoEnvio === "retiro" ? "Retiro en persona" :
                `${metodoEnvio === "correo_argentino" ? "Correo Argentino" : "Andreani"} (${tipoEnvio})`
              } />
              {metodoEnvio !== "retiro" && (
                <SummaryRow label="Dirección" value={`${direccion.calle} ${direccion.numero}${direccion.piso ? `, ${direccion.piso}` : ""}${direccion.departamento ? ` ${direccion.departamento}` : ""}, ${direccion.localidad}, ${direccion.provincia} (${direccion.codigo_postal})`} />
              )}
              <SummaryRow label="Pago" value={
                metodoPago === "transferencia" ? "Transferencia" :
                metodoPago === "mercadopago" ? "MercadoPago (+13%)" : "Efectivo"
              } />
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3 bg-ambar hover:bg-ambar-light text-navy-deep font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "Procesando..." : `Confirmar pedido — ${formatPrice(total)}`}
            </button>
          </section>
        )}
      </div>

      {/* Sidebar — Resumen del carrito */}
      <div className="lg:col-span-1">
        <div className="bg-navy-deep rounded-xl border border-lavanda/10 p-6 sticky top-24 space-y-4">
          <h3 className="font-[family-name:var(--font-cinzel)] text-sm font-bold text-niebla uppercase tracking-wider">
            Tu pedido
          </h3>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {cart.items.map((item) => (
              <div key={`${item.producto_id}-${item.opciones.map(o => o.opcion_id).join("-")}`} className="flex justify-between text-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-lavanda-light truncate">{item.nombre} x{item.cantidad}</p>
                  {item.opciones.length > 0 && (
                    <p className="text-xs text-lavanda/40">
                      {item.opciones.map(o => o.opcion_valor).join(", ")}
                    </p>
                  )}
                </div>
                <span className="text-niebla ml-2 shrink-0">{formatPrice(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-lavanda/10 pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-lavanda/60">Subtotal</span>
              <span className="text-lavanda-light">{formatPrice(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-lavanda/60">Envío</span>
              <span className="text-lavanda-light">
                {metodoEnvio === "retiro" ? "Gratis" : costoEnvio > 0 ? formatPrice(costoEnvio) : "—"}
              </span>
            </div>
            {recargoMP > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-lavanda/60">Recargo MP (13%)</span>
                <span className="text-ambar">{formatPrice(recargoMP)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold pt-2 border-t border-lavanda/10">
              <span className="text-niebla">Total</span>
              <span className="text-ambar text-lg">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-lavanda/60 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-navy border border-lavanda/20 rounded-lg px-4 py-3 text-sm text-niebla placeholder:text-lavanda/30 focus:outline-none focus:border-purpura transition-colors"
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-lavanda/60">{label}</span>
      <span className="text-lavanda-light text-right max-w-[60%]">{value}</span>
    </div>
  );
}
