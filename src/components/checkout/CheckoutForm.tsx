"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCartContext } from "@/components/carrito/CartProvider";
import { formatPrice, calcularRecargoMP, validarDNI, MP_RECARGO_DEFAULT_PCT } from "@/lib/utils";
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

// --- Correo Argentino API types ---
interface CotizacionResult {
  domicilio: { precio: number; producto: string; tiempoMin?: number; tiempoMax?: number } | null;
  sucursal: { precio: number; producto: string; tiempoMin?: number; tiempoMax?: number } | null;
}

interface SucursalCA {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  telefono: string;
  horario: string;
  lat: number | null;
  lng: number | null;
}

interface CheckoutFormProps {
  zonas: EnvioZona[];
  configuracion: Record<string, string>;
  envioGratisDesde?: number;
}

type Step = "datos" | "envio" | "pago" | "resumen";

export default function CheckoutForm({ zonas, configuracion, envioGratisDesde = 0 }: CheckoutFormProps) {
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

  // --- Correo Argentino live cotización ---
  const [cotizacion, setCotizacion] = useState<CotizacionResult | null>(null);
  const [cotizandoEnvio, setCotizandoEnvio] = useState(false);
  const [cotizacionError, setCotizacionError] = useState("");
  const [sucursalesCA, setSucursalesCA] = useState<SucursalCA[]>([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<string>("");
  const [cargandoSucursales, setCargandoSucursales] = useState(false);

  // Debounced CP for live cotización
  const debouncedCP = useDebounce(direccion.codigo_postal, 600);

  // Calcular peso y dimensiones totales del carrito
  const paquete = (() => {
    let pesoTotal = 0;
    let altoMax = 0;
    let anchoMax = 0;
    let largoTotal = 0;

    for (const item of cart.items) {
      const cant = item.cantidad;
      pesoTotal += (item.peso_gr ?? 500) * cant; // default 500g si no tiene
      altoMax = Math.max(altoMax, item.alto_cm ?? 15);
      anchoMax = Math.max(anchoMax, item.ancho_cm ?? 15);
      largoTotal += (item.largo_cm ?? 10) * cant; // se suman apilados
    }

    return {
      weight: pesoTotal || 500,
      height: altoMax || 15,
      width: anchoMax || 15,
      length: Math.min(largoTotal || 10, 150), // máximo razonable
    };
  })();

  // Fetch cotización when CP changes
  useEffect(() => {
    if (metodoEnvio === "retiro") return;
    if (!debouncedCP || debouncedCP.trim().length < 4) {
      setCotizacion(null);
      setCotizacionError("");
      return;
    }
    const match = debouncedCP.match(/\d{4}/);
    if (!match) return;

    let cancelled = false;
    setCotizandoEnvio(true);
    setCotizacionError("");

    fetch("/api/envios/cotizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codigoPostal: match[0], paquete }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setCotizacionError(data.error);
          setCotizacion(null);
        } else {
          setCotizacion(data);
          setCotizacionError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCotizacionError("Error al cotizar el envío. Verificá el código postal e intentá de nuevo.");
          setCotizacion(null);
        }
      })
      .finally(() => {
        if (!cancelled) setCotizandoEnvio(false);
      });

    return () => { cancelled = true; };
  }, [debouncedCP, metodoEnvio]);

  // Fetch sucursales when province/CP changes and tipo is sucursal
  useEffect(() => {
    if (metodoEnvio === "retiro" || tipoEnvio !== "sucursal" || !direccion.provincia) {
      setSucursalesCA([]);
      setSucursalSeleccionada("");
      return;
    }

    let cancelled = false;
    setCargandoSucursales(true);
    setSucursalSeleccionada("");

    const cpParam = debouncedCP ? `&cp=${encodeURIComponent(debouncedCP)}` : "";
    fetch(`/api/envios/sucursales?provincia=${encodeURIComponent(direccion.provincia)}${cpParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.sucursales) {
          setSucursalesCA(data.sucursales);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCargandoSucursales(false);
      });

    return () => { cancelled = true; };
  }, [direccion.provincia, debouncedCP, tipoEnvio, metodoEnvio]);

  // Calcular costo de envío — solo cotización real de la API
  function getCostoEnvio(): number {
    if (metodoEnvio === "retiro") return 0;
    if (!cotizacion) return 0;

    if (tipoEnvio === "domicilio" && cotizacion.domicilio) {
      return cotizacion.domicilio.precio;
    }
    if (tipoEnvio === "sucursal" && cotizacion.sucursal) {
      return cotizacion.sucursal.precio;
    }
    return 0;
  }

  const recargoPct = Number(configuracion.recargo_mp_porcentaje) || MP_RECARGO_DEFAULT_PCT;
  // Envío gratis por monto: si el subtotal alcanza el umbral, el envío es 0.
  const calificaEnvioGratis = envioGratisDesde > 0 && cart.subtotal >= envioGratisDesde;
  const costoEnvio = calificaEnvioGratis ? 0 : getCostoEnvio();
  const recargoMP = metodoPago === "mercadopago" ? calcularRecargoMP(cart.subtotal + costoEnvio, recargoPct) : 0;
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

  // Rangos de CP numérico (4 dígitos) → provincias
  function provinciaFromCP(cp: number): string[] {
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
    if (cp >= 4300 && cp <= 4499) return ["Salta"];
    if (cp >= 4500 && cp <= 4699) return ["Jujuy"];
    if (cp >= 4700 && cp <= 4799) return ["Catamarca"];
    if (cp >= 5000 && cp <= 5299) return ["Córdoba"];
    if (cp >= 5300 && cp <= 5399) return ["La Rioja"];
    if (cp >= 5400 && cp <= 5499) return ["San Juan"];
    if (cp >= 5500 && cp <= 5699) return ["Mendoza"];
    if (cp >= 5700 && cp <= 5799) return ["San Luis"];
    if (cp >= 5800 && cp <= 5899) return ["Córdoba", "San Luis"];
    if (cp >= 5900 && cp <= 5999) return ["Córdoba"];
    // 6000-6499: BA y La Pampa intercaladas (Santa Rosa 6300, Quemú 6360,
    // Catriló 6380 son LP; Trenque Lauquen 6400, Pehuajó 6450 son BA).
    if (cp >= 6000 && cp <= 6499) return ["Buenos Aires", "La Pampa"];
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
    if (cp >= 9200 && cp <= 9399) return ["Santa Cruz"];
    if (cp >= 9400 && cp <= 9599) return ["Tierra del Fuego"];
    return [];
  }

  function validarCPvsProvincia(): string | null {
    const cp = direccion.codigo_postal.trim();
    const prov = direccion.provincia;
    if (!cp || !prov) return null;

    // Extraer los 4 dígitos del CP (acepta "1425" o "C1425CLA")
    const match = cp.match(/\d{4}/);
    if (!match) return null;

    const num = parseInt(match[0], 10);
    const provincias = provinciaFromCP(num);
    if (provincias.length > 0 && !provincias.includes(prov)) {
      return `El código postal ${cp} no corresponde a ${prov}`;
    }

    return null;
  }

  function validarEnvio(): string | null {
    if (metodoEnvio === "retiro") return null;
    if (!direccion.provincia.trim()) return "Seleccioná la provincia";
    if (!direccion.codigo_postal.trim()) return "Ingresá el código postal";
    if (!direccion.calle.trim()) return "Ingresá la calle";
    if (!direccion.numero.trim()) return "Ingresá el número";
    if (!direccion.localidad.trim()) return "Ingresá la localidad";
    const cpErr = validarCPvsProvincia();
    if (cpErr) return cpErr;
    if (cotizandoEnvio) return "Esperá, estamos cotizando el envío...";
    if (!cotizacion) return "Ingresá un código postal válido para cotizar el envío";
    if (cotizacionError) return cotizacionError;
    if (tipoEnvio === "sucursal") {
      if (cargandoSucursales) return "Cargando sucursales...";
      if (sucursalesCA.length > 0 && !sucursalSeleccionada) return "Seleccioná una sucursal de Correo Argentino";
    }
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
      const sucursalData = sucursalSeleccionada ? sucursalesCA.find(s => s.id === sucursalSeleccionada) : null;
      const body: CheckoutData & { items: typeof cart.items; costoEnvio: number; recargoMP: number; subtotal: number; total: number; captchaToken?: string; sucursal_correo_id?: string; sucursal_correo_nombre?: string; cotizacion_real?: boolean } = {
        datos_personales: datos,
        metodo_envio: metodoEnvio,
        tipo_envio: metodoEnvio === "retiro" ? null : tipoEnvio,
        direccion_envio: metodoEnvio === "retiro" ? null : direccion,
        metodo_pago: metodoPago,
        items: cart.items,
        costoEnvio,
        recargoMP,
        subtotal: cart.subtotal,
        total,
        ...(captchaToken && { captchaToken }),
        ...(sucursalSeleccionada && { sucursal_correo_id: sucursalSeleccionada }),
        ...(sucursalData && { sucursal_correo_nombre: `${sucursalData.nombre} — ${sucursalData.direccion}, ${sucursalData.ciudad}` }),
        cotizacion_real: true,
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
        <p className="text-lavanda/75 text-lg">Tu carrito está vacío</p>
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
        <div className="flex gap-2 text-xs text-lavanda/75">
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
                    <p className="text-xs text-lavanda/70">{opt.desc}</p>
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
                      <AutocompleteInput
                        label="Calle"
                        value={direccion.calle}
                        onChange={(v) => setDireccion({ ...direccion, calle: v })}
                        provincia={direccion.provincia}
                        tipo="calles"
                        placeholder={direccion.provincia ? "Escribí para buscar..." : "Seleccioná provincia primero"}
                      />
                    </div>
                    <Input label="Número" value={direccion.numero} onChange={(v) => setDireccion({ ...direccion, numero: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Piso (opc.)" value={direccion.piso} onChange={(v) => setDireccion({ ...direccion, piso: v })} />
                    <Input label="Depto (opc.)" value={direccion.departamento} onChange={(v) => setDireccion({ ...direccion, departamento: v })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Código Postal" value={direccion.codigo_postal} onChange={(v) => setDireccion({ ...direccion, codigo_postal: v })} type="tel" placeholder="Ej: 1425" />
                    <AutocompleteInput
                      label="Localidad"
                      value={direccion.localidad}
                      onChange={(v) => setDireccion({ ...direccion, localidad: v })}
                      provincia={direccion.provincia}
                      tipo="localidades"
                      placeholder={direccion.provincia ? "Escribí para buscar..." : "Seleccioná provincia primero"}
                    />
                  </div>
                </div>

                {/* Aviso de envío gratis por monto */}
                {calificaEnvioGratis && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-3 py-2 text-sm text-emerald-400">
                    <span aria-hidden="true">🎉</span>
                    ¡Tu compra tiene <strong className="font-semibold">envío gratis</strong>!
                  </div>
                )}

                {/* Cotización en vivo */}
                {cotizandoEnvio && (
                  <div className="flex items-center gap-2 text-sm text-lavanda/75">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Cotizando envío...
                  </div>
                )}

                {cotizacionError && (
                  <p className="text-sm text-ambar-light">{cotizacionError}</p>
                )}

                {cotizacion && !cotizandoEnvio && (
                  <div className="bg-navy/50 border border-lavanda/10 rounded-lg p-3 space-y-1">
                    {cotizacion.domicilio && (
                      <div className="flex justify-between text-sm">
                        <span className="text-lavanda-light">A domicilio ({cotizacion.domicilio.producto})</span>
                        <span className={`font-semibold ${tipoEnvio === "domicilio" ? "text-ambar" : "text-lavanda/75"}`}>
                          {formatPrice(cotizacion.domicilio.precio)}
                        </span>
                      </div>
                    )}
                    {cotizacion.sucursal && (
                      <div className="flex justify-between text-sm">
                        <span className="text-lavanda-light">A sucursal ({cotizacion.sucursal.producto})</span>
                        <span className={`font-semibold ${tipoEnvio === "sucursal" ? "text-ambar" : "text-lavanda/75"}`}>
                          {formatPrice(cotizacion.sucursal.precio)}
                        </span>
                      </div>
                    )}
                    {(cotizacion.domicilio?.tiempoMin || cotizacion.domicilio?.tiempoMax) && (
                      <p className="text-xs text-lavanda/60 mt-1">
                        Tiempo estimado: {cotizacion.domicilio?.tiempoMin}–{cotizacion.domicilio?.tiempoMax} días hábiles
                      </p>
                    )}
                  </div>
                )}

                {/* Sucursal selector */}
                {tipoEnvio === "sucursal" && metodoEnvio === "correo_argentino" && direccion.provincia && (
                  <div className="space-y-2">
                    {cargandoSucursales ? (
                      <div className="flex items-center gap-2 text-sm text-lavanda/75">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Cargando sucursales...
                      </div>
                    ) : sucursalesCA.length > 0 ? (
                      <>
                        <label className="block text-xs text-lavanda/75">Sucursal de retiro</label>
                        <select
                          value={sucursalSeleccionada}
                          onChange={(e) => setSucursalSeleccionada(e.target.value)}
                          className="w-full bg-navy border border-lavanda/20 rounded-lg px-4 py-3 text-sm text-niebla focus:outline-none focus:border-purpura"
                        >
                          <option value="">Seleccioná una sucursal</option>
                          {sucursalesCA.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nombre} — {s.direccion}, {s.ciudad}
                            </option>
                          ))}
                        </select>
                        {sucursalSeleccionada && (() => {
                          const sel = sucursalesCA.find(s => s.id === sucursalSeleccionada);
                          return sel ? (
                            <div className="text-xs text-lavanda/60 space-y-0.5">
                              <p>{sel.direccion}, {sel.ciudad} ({sel.codigoPostal})</p>
                              {sel.horario && <p>Horario: {sel.horario}</p>}
                              {sel.telefono && <p>Tel: {sel.telefono}</p>}
                            </div>
                          ) : null;
                        })()}
                      </>
                    ) : null}
                  </div>
                )}

                {/* Mensaje cuando falta cotización */}
                {!cotizacion && !cotizandoEnvio && !cotizacionError && direccion.codigo_postal.trim().length < 4 && (
                  <p className="text-sm text-lavanda/60">
                    Ingresá el código postal para ver el costo de envío
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
                  <p className="text-xs text-lavanda/70">Sin recargo. 48hs para enviar comprobante.</p>
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
                  <p className="text-xs text-lavanda/70">Tarjeta, dinero en cuenta, Rapipago. +{recargoPct}% recargo.</p>
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
                    <p className="text-xs text-lavanda/70">Pagás al retirar. Sin recargo.</p>
                  </div>
                </label>
              )}
            </div>

            {metodoPago === "mercadopago" && (
              <div className="bg-ambar/10 border border-ambar/20 rounded-lg px-4 py-3 text-sm text-ambar-light">
                Recargo MercadoPago ({recargoPct}%): {formatPrice(recargoMP)}
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
                `Correo Argentino (${tipoEnvio === "domicilio" ? "a domicilio" : "a sucursal"})`
              } />
              {metodoEnvio !== "retiro" && (
                <SummaryRow label="Dirección" value={`${direccion.calle} ${direccion.numero}${direccion.piso ? `, ${direccion.piso}` : ""}${direccion.departamento ? ` ${direccion.departamento}` : ""}, ${direccion.localidad}, ${direccion.provincia} (${direccion.codigo_postal})`} />
              )}
              {sucursalSeleccionada && (() => {
                const sel = sucursalesCA.find(s => s.id === sucursalSeleccionada);
                return sel ? <SummaryRow label="Sucursal" value={`${sel.nombre} — ${sel.direccion}, ${sel.ciudad}`} /> : null;
              })()}
              <SummaryRow label="Pago" value={
                metodoPago === "transferencia" ? "Transferencia" :
                metodoPago === "mercadopago" ? `MercadoPago (+${recargoPct}%)` : "Efectivo"
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
                    <p className="text-xs text-lavanda/75">
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
              <span className="text-lavanda/75">Subtotal</span>
              <span className="text-lavanda-light">{formatPrice(cart.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-lavanda/75">
                Envío
                {cotizandoEnvio && <span className="text-xs ml-1 text-lavanda/50">(cotizando...)</span>}
              </span>
              <span className={calificaEnvioGratis && metodoEnvio !== "retiro" ? "text-emerald-400 font-semibold" : "text-lavanda-light"}>
                {metodoEnvio === "retiro"
                  ? "Gratis"
                  : calificaEnvioGratis
                  ? "GRATIS 🎉"
                  : cotizandoEnvio
                  ? "..."
                  : getCostoEnvio() > 0
                  ? formatPrice(getCostoEnvio())
                  : "Ingresá CP"}
              </span>
            </div>
            {recargoMP > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-lavanda/75">Recargo MP ({recargoPct}%)</span>
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
      <label className="block text-xs text-lavanda/75 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-navy border border-lavanda/20 rounded-lg px-4 py-3 text-sm text-niebla placeholder:text-lavanda/50 focus:outline-none focus:border-purpura transition-colors"
      />
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-lavanda/75">{label}</span>
      <span className="text-lavanda-light text-right max-w-[60%]">{value}</span>
    </div>
  );
}

// Mapeo de provincia del form → nombre en API georef
const PROVINCIA_GEOREF: Record<string, string> = {
  "CABA": "Ciudad Autónoma de Buenos Aires",
  "Buenos Aires": "Buenos Aires",
  "Catamarca": "Catamarca",
  "Chaco": "Chaco",
  "Chubut": "Chubut",
  "Córdoba": "Córdoba",
  "Corrientes": "Corrientes",
  "Entre Ríos": "Entre Ríos",
  "Formosa": "Formosa",
  "Jujuy": "Jujuy",
  "La Pampa": "La Pampa",
  "La Rioja": "La Rioja",
  "Mendoza": "Mendoza",
  "Misiones": "Misiones",
  "Neuquén": "Neuquén",
  "Río Negro": "Río Negro",
  "Salta": "Salta",
  "San Juan": "San Juan",
  "San Luis": "San Luis",
  "Santa Cruz": "Santa Cruz",
  "Santa Fe": "Santa Fe",
  "Santiago del Estero": "Santiago del Estero",
  "Tierra del Fuego": "Tierra del Fuego, Antártida e Islas del Atlántico Sur",
  "Tucumán": "Tucumán",
};

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function AutocompleteInput({
  label,
  value,
  onChange,
  provincia,
  tipo,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  provincia: string;
  tipo: "calles" | "localidades";
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const debouncedValue = useDebounce(value, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (query: string, prov: string) => {
    if (query.length < 2 || !prov) {
      setSuggestions([]);
      return;
    }
    const provGeoref = PROVINCIA_GEOREF[prov];
    if (!provGeoref) return;

    try {
      const params = new URLSearchParams({
        nombre: query,
        provincia: provGeoref,
        max: "6",
      });
      const res = await fetch(`https://apis.datos.gob.ar/georef/api/${tipo}?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      const items = data[tipo] as { nombre: string }[];
      const names = [...new Set(items.map((i) => i.nombre))];
      setSuggestions(names);
      setOpen(names.length > 0);
    } catch {
      setSuggestions([]);
    }
  }, [tipo]);

  useEffect(() => {
    fetchSuggestions(debouncedValue, provincia);
  }, [debouncedValue, provincia, fetchSuggestions]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-xs text-lavanda/75 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { setFocused(true); if (suggestions.length > 0) setOpen(true); }}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full bg-navy border border-lavanda/20 rounded-lg px-4 py-3 text-sm text-niebla placeholder:text-lavanda/50 focus:outline-none focus:border-purpura transition-colors"
      />
      {open && focused && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-navy-deep border border-lavanda/20 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s) => (
            <li
              key={s}
              onMouseDown={() => {
                onChange(s);
                setOpen(false);
                setSuggestions([]);
              }}
              className="px-4 py-2 text-sm text-lavanda-light hover:bg-purpura/20 hover:text-niebla cursor-pointer transition-colors"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
