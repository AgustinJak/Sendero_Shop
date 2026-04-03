"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCartContext } from "@/components/carrito/CartProvider";
import { formatPrice, calcularRecargoMP, validarDNI } from "@/lib/utils";
import { trackBeginCheckout, trackPurchase } from "@/lib/analytics";
import { Turnstile } from "@marsidev/react-turnstile";
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
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

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
  const ALLOWED_EMAIL_DOMAINS = [
    "gmail.com", "hotmail.com", "hotmail.com.ar", "outlook.com", "outlook.com.ar",
    "yahoo.com", "yahoo.com.ar", "live.com", "live.com.ar",
    "icloud.com", "protonmail.com", "proton.me",
    "msn.com", "aol.com", "zoho.com",
  ];

  function validarEmail(email: string): string | null {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return "Ingresá tu email";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return "Email inválido";
    const domain = trimmed.split("@")[1];
    if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
      return "Usá un email de Gmail, Hotmail, Outlook o Yahoo";
    }
    return null;
  }

  function validarDatos(): string | null {
    if (!datos.nombre_completo.trim()) return "Ingresá tu nombre completo";
    if (datos.nombre_completo.trim().split(/\s+/).length < 2) return "Ingresá nombre y apellido";
    if (!datos.dni.trim() || !validarDNI(datos.dni)) return "DNI inválido (7-8 dígitos)";
    const emailErr = validarEmail(datos.email);
    if (emailErr) return emailErr;
    if (!datos.telefono.trim()) return "Ingresá tu teléfono";
    if (datos.telefono.replace(/\D/g, "").length < 8) return "Teléfono inválido (mínimo 8 dígitos)";
    return null;
  }

  // Mapeo de código postal argentino (CPA letra → provincia)
  const CP_PROVINCIA: Record<string, string[]> = {
    C: ["CABA"],
    B: ["Buenos Aires"],
    A: ["Salta"],
    D: ["San Luis"],
    E: ["Entre Ríos"],
    F: ["La Rioja"],
    G: ["Santiago del Estero"],
    H: ["Chaco"],
    J: ["San Juan"],
    K: ["Catamarca"],
    L: ["La Pampa"],
    M: ["Mendoza"],
    N: ["Misiones"],
    P: ["Formosa"],
    Q: ["Neuquén"],
    R: ["Río Negro"],
    S: ["Santa Fe"],
    T: ["Tucumán"],
    U: ["Chubut"],
    V: ["Tierra del Fuego"],
    W: ["Corrientes"],
    X: ["Córdoba"],
    Y: ["Jujuy"],
    Z: ["Santa Cruz"],
  };

  // Rangos de CP numérico (4 dígitos) → provincias
  function provinciaFromCPNumerico(cp: number): string[] {
    if (cp >= 1000 && cp <= 1499) return ["CABA"];
    if (cp >= 1500 && cp <= 1999) return ["Buenos Aires"];
    if (cp >= 2000 && cp <= 2199) return ["Santa Fe"];
    if (cp >= 2200 && cp <= 2499) return ["Santa Fe", "Córdoba"];
    if (cp >= 2500 && cp <= 2699) return ["Santa Fe"];
    if (cp >= 2700 && cp <= 2999) return ["Buenos Aires"];
    if (cp >= 3000 && cp <= 3199) return ["Entre Ríos", "Santa Fe"];
    if (cp >= 3200 && cp <= 3299) return ["Entre Ríos"];
    if (cp >= 3300 && cp <= 3399) return ["Misiones", "Corrientes"];
    if (cp >= 3400 && cp <= 3499) return ["Corrientes"];
    if (cp >= 3500 && cp <= 3599) return ["Chaco"];
    if (cp >= 3600 && cp <= 3699) return ["Formosa"];
    if (cp >= 3700 && cp <= 3799) return ["Chaco", "Corrientes"];
    if (cp >= 4000 && cp <= 4199) return ["Tucumán"];
    if (cp >= 4200 && cp <= 4299) return ["Santiago del Estero"];
    if (cp >= 4300 && cp <= 4399) return ["Salta"];
    if (cp >= 4400 && cp <= 4499) return ["Salta"];
    if (cp >= 4500 && cp <= 4599) return ["Jujuy"];
    if (cp >= 4600 && cp <= 4699) return ["Jujuy"];
    if (cp >= 4700 && cp <= 4799) return ["Catamarca"];
    if (cp >= 5000 && cp <= 5299) return ["Córdoba"];
    if (cp >= 5300 && cp <= 5399) return ["La Rioja"];
    if (cp >= 5400 && cp <= 5499) return ["San Juan"];
    if (cp >= 5500 && cp <= 5699) return ["Mendoza"];
    if (cp >= 5700 && cp <= 5799) return ["San Luis"];
    if (cp >= 5800 && cp <= 5899) return ["Córdoba", "San Luis"];
    if (cp >= 5900 && cp <= 5999) return ["Córdoba"];
    if (cp >= 6000 && cp <= 6499) return ["Buenos Aires"];
    if (cp >= 6500 && cp <= 6599) return ["Buenos Aires", "La Pampa"];
    if (cp >= 6600 && cp <= 6699) return ["La Pampa"];
    if (cp >= 6700 && cp <= 6799) return ["Buenos Aires"];
    if (cp >= 7000 && cp <= 7699) return ["Buenos Aires"];
    if (cp >= 7700 && cp <= 7799) return ["Buenos Aires"];
    if (cp >= 8000 && cp <= 8199) return ["Buenos Aires"];
    if (cp >= 8200 && cp <= 8299) return ["Neuquén", "Río Negro"];
    if (cp >= 8300 && cp <= 8399) return ["Neuquén"];
    if (cp >= 8400 && cp <= 8499) return ["Río Negro"];
    if (cp >= 8500 && cp <= 8599) return ["Chubut"];
    if (cp >= 8700 && cp <= 8799) return ["Buenos Aires"];
    if (cp >= 9000 && cp <= 9099) return ["Chubut"];
    if (cp >= 9100 && cp <= 9199) return ["Chubut", "Santa Cruz"];
    if (cp >= 9200 && cp <= 9299) return ["Santa Cruz"];
    if (cp >= 9300 && cp <= 9399) return ["Santa Cruz"];
    if (cp >= 9400 && cp <= 9499) return ["Tierra del Fuego"];
    if (cp >= 9500 && cp <= 9599) return ["Tierra del Fuego"];
    return [];
  }

  function validarCPvsProvincia(): string | null {
    const cp = direccion.codigo_postal.trim().toUpperCase();
    const prov = direccion.provincia;
    if (!cp || !prov) return null;

    // CPA format: letra + 4 dígitos + 3 letras (ej: C1425CLA)
    if (/^[A-Z]\d{4}/.test(cp)) {
      const letra = cp[0];
      const provincias = CP_PROVINCIA[letra];
      if (provincias && !provincias.includes(prov)) {
        return `El código postal ${cp} no corresponde a ${prov}`;
      }
    }
    // Formato numérico: 4 dígitos
    else if (/^\d{4}$/.test(cp)) {
      const num = parseInt(cp, 10);
      const provincias = provinciaFromCPNumerico(num);
      if (provincias.length > 0 && !provincias.includes(prov)) {
        return `El código postal ${cp} no corresponde a ${prov}`;
      }
    }

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
    const cpErr = validarCPvsProvincia();
    if (cpErr) return cpErr;
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
      const body: CheckoutData & { items: typeof cart.items; costoEnvio: number; recargoMP: number; subtotal: number; total: number; captchaToken?: string } = {
        datos_personales: datos,
        metodo_envio: metodoEnvio,
        direccion_envio: metodoEnvio === "retiro" ? null : direccion,
        metodo_pago: metodoPago,
        items: cart.items,
        costoEnvio,
        recargoMP,
        subtotal: cart.subtotal,
        total,
        ...(captchaToken && { captchaToken }),
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

            {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <div className="flex justify-center">
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onError={() => setCaptchaToken(null)}
                  onExpire={() => setCaptchaToken(null)}
                  options={{ theme: "dark", size: "normal" }}
                />
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading || (!!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !captchaToken)}
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
