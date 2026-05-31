"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";
import { formatPrice } from "@/lib/utils";
import { calculateSena, getItemImagenes } from "@/lib/borrador";
import type {
  PedidoBorradorItem,
  MetodoEnvio,
  MetodoPago,
  TipoEnvio,
  DireccionEnvio,
  SenaTipo,
} from "@/types";

interface BorradorClient {
  id: string;
  token: string;
  items: PedidoBorradorItem[];
  descuento_monto: number;
  descuento_porcentaje: number;
  costo_envio_override: number | null;
  envio_gratis: boolean;
  metodos_pago_permitidos: MetodoPago[] | null;
  sena_tipo: SenaTipo | null;
  sena_valor: number | null;
  expires_at: string;
}

const PROVINCIAS = [
  "CABA", "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones",
  "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis", "Santa Cruz",
  "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

const RECARGO_MP_PCT = 13;

interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  codigoPostal: string;
  horario: string;
}

export default function CustomCheckout({
  borrador,
  subtotal,
  descuento,
  turnstileSiteKey,
  whatsapp,
}: {
  borrador: BorradorClient;
  subtotal: number;
  descuento: number;
  turnstileSiteKey: string | null;
  whatsapp: string;
}) {
  const router = useRouter();

  // Datos personales
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");

  // Envío
  const [metodoEnvio, setMetodoEnvio] = useState<MetodoEnvio>("retiro");
  const [tipoEnvio, setTipoEnvio] = useState<TipoEnvio>("domicilio");
  const [provincia, setProvincia] = useState("");
  const [cp, setCp] = useState("");
  const [calle, setCalle] = useState("");
  const [numero, setNumero] = useState("");
  const [piso, setPiso] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [localidad, setLocalidad] = useState("");

  // Sucursales
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalSel, setSucursalSel] = useState("");
  const [cargandoSucursales, setCargandoSucursales] = useState(false);

  // Cotización
  const [costoEnvio, setCostoEnvio] = useState<number | null>(null);
  const [cotizando, setCotizando] = useState(false);
  const [cotizacionError, setCotizacionError] = useState<string | null>(null);

  // Pago
  const tieneSena = borrador.sena_tipo !== null && borrador.sena_valor !== null;
  // Si tiene seña, efectivo no se permite (anticipo digital obligatorio)
  const baseMetodos =
    borrador.metodos_pago_permitidos ??
    (["mercadopago", "transferencia", "efectivo"] as MetodoPago[]);
  const metodosPermitidos = tieneSena
    ? baseMetodos.filter((m) => m !== "efectivo")
    : baseMetodos;
  const [metodoPago, setMetodoPago] = useState<MetodoPago>(metodosPermitidos[0]);

  // En efectivo solo se permite si el método de envío es retiro Y no hay seña
  const efectivoDisponible =
    metodosPermitidos.includes("efectivo") && metodoEnvio === "retiro" && !tieneSena;

  // Si cambia el envío y vuelve incompatible con efectivo, cambiar método
  useEffect(() => {
    if (metodoPago === "efectivo" && !efectivoDisponible) {
      const fallback =
        metodosPermitidos.find((m) => m !== "efectivo") ?? "transferencia";
      setMetodoPago(fallback);
    }
  }, [metodoPago, efectivoDisponible, metodosPermitidos]);

  // Turnstile
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lightbox de imágenes (array de URLs + índice activo)
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  // Cerrar lightbox con ESC + navegar con flechas
  useEffect(() => {
    if (!lightbox) return;
    function onKey(e: KeyboardEvent) {
      if (!lightbox) return;
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") {
        setLightbox((lb) =>
          lb ? { ...lb, index: (lb.index + 1) % lb.images.length } : lb
        );
      }
      if (e.key === "ArrowLeft") {
        setLightbox((lb) =>
          lb
            ? { ...lb, index: (lb.index - 1 + lb.images.length) % lb.images.length }
            : lb
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  // Countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const msRestantes = Math.max(0, new Date(borrador.expires_at).getTime() - now);
  const expiroEnVivo = msRestantes === 0;
  const horas = Math.floor(msRestantes / 3_600_000);
  const minutos = Math.floor((msRestantes % 3_600_000) / 60_000);
  const segundos = Math.floor((msRestantes % 60_000) / 1000);
  const urgente = msRestantes < 6 * 3_600_000;

  // ----- Cotización: dispara cuando cambian datos relevantes -----
  const cpDebounced = useDebouncedValue(cp, 500);

  // Si admin definió costo fijo o gratis, no cotizamos
  const cotizacionRequerida =
    metodoEnvio !== "retiro" &&
    !borrador.envio_gratis &&
    borrador.costo_envio_override === null;

  useEffect(() => {
    if (metodoEnvio === "retiro") {
      setCostoEnvio(0);
      setCotizacionError(null);
      return;
    }
    if (borrador.envio_gratis) {
      setCostoEnvio(0);
      setCotizacionError(null);
      return;
    }
    if (borrador.costo_envio_override !== null) {
      setCostoEnvio(Number(borrador.costo_envio_override));
      setCotizacionError(null);
      return;
    }
    // Cotizar
    if (!cpDebounced || !/^\d{4}$/.test(cpDebounced)) {
      setCostoEnvio(null);
      return;
    }
    let cancelled = false;
    setCotizando(true);
    setCotizacionError(null);
    fetch("/api/envios/cotizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // El paquete lo arma el server al confirmar — para cotizar usamos
      // los defaults de la API (sin paquete = defaults). Si necesitamos
      // exactitud podemos mandar las dims del borrador como prop.
      body: JSON.stringify({ codigoPostal: cpDebounced }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setCotizacionError(data.error);
          setCostoEnvio(null);
          return;
        }
        const rate =
          tipoEnvio === "sucursal" ? data.sucursal : data.domicilio;
        if (!rate) {
          setCotizacionError("No pudimos cotizar para ese CP");
          setCostoEnvio(null);
          return;
        }
        // El endpoint devuelve `precio` (español); aceptamos ambos por compat.
        const precio = typeof rate.precio === "number" ? rate.precio : rate.price;
        if (typeof precio !== "number" || isNaN(precio)) {
          setCotizacionError("La cotización no devolvió un precio válido");
          setCostoEnvio(null);
          return;
        }
        setCostoEnvio(precio);
      })
      .catch(() => {
        if (!cancelled) setCotizacionError("Error de red al cotizar");
      })
      .finally(() => !cancelled && setCotizando(false));
    return () => {
      cancelled = true;
    };
  }, [cpDebounced, tipoEnvio, metodoEnvio, borrador.envio_gratis, borrador.costo_envio_override]);

  // ----- Sucursales: cuando elige tipo=sucursal -----
  useEffect(() => {
    if (metodoEnvio !== "correo_argentino" || tipoEnvio !== "sucursal" || !provincia) {
      setSucursales([]);
      setSucursalSel("");
      return;
    }
    let cancelled = false;
    setCargandoSucursales(true);
    const cpQ = cpDebounced ? `&cp=${encodeURIComponent(cpDebounced)}` : "";
    fetch(`/api/envios/sucursales?provincia=${encodeURIComponent(provincia)}${cpQ}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setSucursales(data.sucursales || []);
      })
      .finally(() => !cancelled && setCargandoSucursales(false));
    return () => {
      cancelled = true;
    };
  }, [metodoEnvio, tipoEnvio, provincia, cpDebounced]);

  // ----- Totales -----
  const baseTotal = subtotal - descuento + (costoEnvio ?? 0);
  const recargoMP =
    metodoPago === "mercadopago"
      ? Math.round((baseTotal * RECARGO_MP_PCT) / 100)
      : 0;
  const total = baseTotal + recargoMP;

  // Seña: se calcula sobre subtotal - descuento (NO incluye envío ni recargo).
  // El saldo absorbe el costo del envío.
  const montoSena = useMemo(() => {
    if (!tieneSena) return null;
    return calculateSena(subtotal - descuento, borrador.sena_tipo, borrador.sena_valor);
  }, [tieneSena, subtotal, descuento, borrador.sena_tipo, borrador.sena_valor]);
  // El saldo es lo que falta para llegar al total
  const montoSaldo =
    montoSena !== null && costoEnvio !== null ? total - montoSena : null;
  // Lo que el cliente realmente paga ahora (seña si aplica, total si no)
  const montoAPagar = montoSena ?? total;

  // ----- Validación form -----
  const validacion = useMemo(() => {
    if (!nombre.trim() || nombre.trim().split(/\s+/).length < 2)
      return "Ingresá nombre y apellido";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Email inválido";
    if (telefono.replace(/\D/g, "").length < 8)
      return "Teléfono inválido (mínimo 8 dígitos)";
    if (metodoEnvio !== "retiro") {
      if (!provincia) return "Seleccioná provincia";
      if (!/^\d{4}$/.test(cp)) return "CP inválido (4 dígitos)";
      if (tipoEnvio === "domicilio") {
        if (!calle.trim()) return "Ingresá la calle";
        if (!numero.trim()) return "Ingresá el número";
        if (!localidad.trim()) return "Ingresá la localidad";
      }
      if (tipoEnvio === "sucursal" && !sucursalSel) {
        return "Elegí una sucursal";
      }
      if (cotizando) return "Esperá la cotización del envío";
      if (cotizacionRequerida && costoEnvio === null) {
        return cotizacionError || "Falta cotizar el envío";
      }
    }
    if (turnstileSiteKey && !captchaToken)
      return "Completá la verificación de seguridad";
    return null;
  }, [
    nombre, email, telefono, metodoEnvio, provincia, cp, tipoEnvio,
    calle, numero, localidad, sucursalSel, cotizando, cotizacionRequerida,
    costoEnvio, cotizacionError, turnstileSiteKey, captchaToken,
  ]);

  async function submit() {
    setError(null);
    if (validacion) {
      setError(validacion);
      return;
    }
    setSubmitting(true);
    try {
      let direccion: DireccionEnvio | null = null;
      if (metodoEnvio !== "retiro") {
        direccion = {
          calle: calle.trim(),
          numero: numero.trim(),
          piso: piso.trim(),
          departamento: departamento.trim(),
          codigo_postal: cp.trim(),
          localidad: localidad.trim(),
          provincia,
        };
      }
      const sucursal = sucursales.find((s) => s.id === sucursalSel);
      const body = {
        datos_personales: {
          nombre_completo: nombre.trim(),
          dni: dni.trim() || undefined,
          email: email.trim(),
          telefono: telefono.trim(),
        },
        metodo_envio: metodoEnvio,
        tipo_envio: metodoEnvio === "retiro" ? null : tipoEnvio,
        direccion_envio: direccion,
        sucursal_correo_id: sucursal?.id || null,
        sucursal_correo_nombre: sucursal?.nombre || null,
        metodo_pago: metodoPago,
        captchaToken,
      };
      const res = await fetch(`/api/borradores/publico/${borrador.token}/confirmar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al confirmar el pedido");
        return;
      }
      router.push(`/pedido/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (expiroEnVivo) {
    return (
      <div className="min-h-screen bg-navy-deep flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-navy rounded-xl border border-lavanda/10 p-8 text-center space-y-4">
          <h1 className="font-[family-name:var(--font-cinzel)] text-xl text-niebla">
            Este link acaba de expirar
          </h1>
          <p className="text-sm text-lavanda">
            Pedile al vendedor que te genere uno nuevo.
          </p>
          <a
            href={`https://wa.me/${whatsapp}`}
            className="inline-block px-4 py-2 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-sm rounded-lg transition-colors"
          >
            WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-deep py-6 lg:py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="font-[family-name:var(--font-cinzel)] text-lg text-niebla">
            SENDERO SHOP
          </Link>
          <span className="text-xs text-lavanda/40">Pedido custom</span>
        </div>

        {/* Countdown */}
        <div
          className={`rounded-xl border p-3 text-sm flex items-center gap-2 ${
            urgente
              ? "bg-amber-400/10 border-amber-400/30 text-amber-300"
              : "bg-purpura/10 border-purpura/30 text-lavanda-light"
          }`}
        >
          <span className="font-medium">⏱ Este pedido expira en</span>
          <span className="font-mono">
            {String(horas).padStart(2, "0")}h {String(minutos).padStart(2, "0")}m{" "}
            {String(segundos).padStart(2, "0")}s
          </span>
        </div>

        {/* Items */}
        <section className="bg-navy rounded-xl border border-lavanda/10 p-4">
          <h2 className="font-[family-name:var(--font-cinzel)] text-sm text-niebla mb-3 uppercase tracking-wider">
            Tu pedido
          </h2>
          <div className="space-y-4">
            {borrador.items.map((it, idx) => {
              const imagenes = getItemImagenes(it);
              const hasMultiple = imagenes.length > 1;
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex gap-3 items-center">
                    {imagenes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setLightbox({ images: imagenes, index: 0 })}
                        className="relative shrink-0 group focus:outline-none focus:ring-2 focus:ring-purpura rounded-lg"
                        aria-label={`Ver imagen de ${it.nombre}`}
                      >
                        <Image
                          src={imagenes[0]}
                          alt={it.nombre}
                          width={64}
                          height={64}
                          className="rounded-lg object-cover bg-navy-deep w-16 h-16 transition-transform group-hover:scale-105"
                          unoptimized
                        />
                        {hasMultiple && (
                          <span className="absolute bottom-0 right-0 bg-navy/90 text-niebla text-[10px] px-1.5 py-0.5 rounded-tl-lg rounded-br-lg font-medium">
                            +{imagenes.length - 1}
                          </span>
                        )}
                      </button>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-niebla">{it.nombre}</p>
                      {it.descripcion && (
                        <p className="text-xs text-lavanda/60">{it.descripcion}</p>
                      )}
                      <p className="text-xs text-lavanda">
                        {it.cantidad} × {formatPrice(it.precio_unitario)}
                      </p>
                    </div>
                    <p className="text-sm text-niebla font-medium whitespace-nowrap">
                      {formatPrice(it.precio_unitario * it.cantidad)}
                    </p>
                  </div>

                  {/* Strip de thumbnails extras (si hay >1 imagen) */}
                  {hasMultiple && (
                    <div className="flex gap-1.5 overflow-x-auto pl-[76px]">
                      {imagenes.slice(1).map((url, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setLightbox({ images: imagenes, index: i + 1 })}
                          className="shrink-0 rounded-md overflow-hidden focus:outline-none focus:ring-2 focus:ring-purpura"
                          aria-label={`Ver imagen ${i + 2} de ${it.nombre}`}
                        >
                          <Image
                            src={url}
                            alt={`${it.nombre} ${i + 2}`}
                            width={48}
                            height={48}
                            className="w-12 h-12 object-cover bg-navy-deep hover:opacity-80 transition-opacity"
                            unoptimized
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Datos personales */}
        <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
          <h2 className="font-[family-name:var(--font-cinzel)] text-sm text-niebla uppercase tracking-wider">
            Tus datos
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Nombre y apellido" value={nombre} onChange={setNombre} />
            <Input label="DNI (opcional)" value={dni} onChange={setDni} />
            <Input label="Email" type="email" value={email} onChange={setEmail} />
            <Input label="Teléfono" value={telefono} onChange={setTelefono} />
          </div>
        </section>

        {/* Envío */}
        <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
          <h2 className="font-[family-name:var(--font-cinzel)] text-sm text-niebla uppercase tracking-wider">
            Envío
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            <RadioCard
              checked={metodoEnvio === "retiro"}
              onClick={() => setMetodoEnvio("retiro")}
              title="Retiro en persona"
              desc="Villa Crespo, CABA — coordinás por WhatsApp"
            />
            <RadioCard
              checked={metodoEnvio === "correo_argentino"}
              onClick={() => setMetodoEnvio("correo_argentino")}
              title="Correo Argentino"
              desc="A domicilio o sucursal"
            />
          </div>

          {metodoEnvio === "correo_argentino" && (
            <div className="space-y-3 pt-2">
              <div className="flex gap-2">
                <RadioPill
                  checked={tipoEnvio === "domicilio"}
                  onClick={() => setTipoEnvio("domicilio")}
                  label="A domicilio"
                />
                <RadioPill
                  checked={tipoEnvio === "sucursal"}
                  onClick={() => setTipoEnvio("sucursal")}
                  label="A sucursal"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Select
                  label="Provincia"
                  value={provincia}
                  onChange={setProvincia}
                  options={["", ...PROVINCIAS]}
                />
                <Input label="Código postal" value={cp} onChange={setCp} />
              </div>
              {tipoEnvio === "domicilio" && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="Calle" value={calle} onChange={setCalle} />
                  <Input label="Número" value={numero} onChange={setNumero} />
                  <Input label="Piso (opcional)" value={piso} onChange={setPiso} />
                  <Input label="Depto (opcional)" value={departamento} onChange={setDepartamento} />
                  <div className="sm:col-span-2">
                    <Input label="Localidad" value={localidad} onChange={setLocalidad} />
                  </div>
                </div>
              )}
              {tipoEnvio === "sucursal" && (
                <div>
                  <label className="text-xs text-lavanda/60">Sucursal</label>
                  {cargandoSucursales ? (
                    <p className="text-sm text-lavanda/40 py-2">Cargando sucursales…</p>
                  ) : sucursales.length === 0 ? (
                    <p className="text-sm text-lavanda/40 py-2">
                      {provincia
                        ? "No hay sucursales para esta provincia"
                        : "Elegí provincia primero"}
                    </p>
                  ) : (
                    <select
                      value={sucursalSel}
                      onChange={(e) => setSucursalSel(e.target.value)}
                      className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
                    >
                      <option value="">Elegí una sucursal</option>
                      {sucursales.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nombre} — {s.direccion} ({s.ciudad})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              {cotizando && (
                <p className="text-xs text-lavanda/60">Cotizando envío…</p>
              )}
              {cotizacionError && !cotizando && (
                <p className="text-xs text-red-400">{cotizacionError}</p>
              )}
            </div>
          )}
        </section>

        {/* Pago */}
        <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
          <h2 className="font-[family-name:var(--font-cinzel)] text-sm text-niebla uppercase tracking-wider">
            Método de pago
          </h2>
          <div className="space-y-2">
            {metodosPermitidos.includes("transferencia") && (
              <PaymentRow
                checked={metodoPago === "transferencia"}
                onClick={() => setMetodoPago("transferencia")}
                title="Transferencia bancaria"
                desc="Te enviamos los datos por email. Sin recargo."
              />
            )}
            {metodosPermitidos.includes("mercadopago") && (
              <PaymentRow
                checked={metodoPago === "mercadopago"}
                onClick={() => setMetodoPago("mercadopago")}
                title="MercadoPago"
                desc="Tarjeta, dinero en cuenta, Rapipago. +13% recargo."
              />
            )}
            {metodosPermitidos.includes("efectivo") && efectivoDisponible && (
              <PaymentRow
                checked={metodoPago === "efectivo"}
                onClick={() => setMetodoPago("efectivo")}
                title="Efectivo"
                desc="Pagás al retirar. Sin recargo."
              />
            )}
            {metodosPermitidos.includes("efectivo") && !efectivoDisponible && (
              <p className="text-xs text-lavanda/40">
                * Efectivo solo está disponible si elegís retiro en persona
              </p>
            )}
          </div>
        </section>

        {/* Resumen */}
        <section className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-1 text-sm">
          <div className="flex justify-between text-lavanda">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {descuento > 0 && (
            <div className="flex justify-between text-emerald-400">
              <span>
                Descuento{" "}
                {borrador.descuento_porcentaje > 0
                  ? `(${borrador.descuento_porcentaje}%)`
                  : "(monto fijo)"}
              </span>
              <span>−{formatPrice(descuento)}</span>
            </div>
          )}
          <div className="flex justify-between text-lavanda">
            <span>Envío</span>
            <span>
              {metodoEnvio === "retiro"
                ? "Gratis (retiro)"
                : costoEnvio === null
                ? "—"
                : costoEnvio === 0
                ? "Gratis"
                : formatPrice(costoEnvio)}
            </span>
          </div>
          {recargoMP > 0 && (
            <div className="flex justify-between text-ambar">
              <span>Recargo MercadoPago (13%)</span>
              <span>{formatPrice(recargoMP)}</span>
            </div>
          )}
          <div className="flex justify-between text-niebla font-semibold pt-2 border-t border-lavanda/10">
            <span>Total</span>
            <span className="text-ambar">{formatPrice(total)}</span>
          </div>

          {/* Desglose de seña — solo se muestra cuando ya está cotizado */}
          {tieneSena && montoSena !== null && montoSaldo !== null && (
            <div className="mt-3 pt-3 border-t border-purpura/30 space-y-1.5 bg-purpura/5 -mx-4 -mb-4 px-4 pb-4 rounded-b-xl">
              <p className="text-xs text-lavanda/70 uppercase tracking-wider pt-1">
                Pagás en 2 partes
              </p>
              <div className="flex justify-between text-niebla">
                <span className="font-medium">
                  💰 Seña ahora
                  {borrador.sena_tipo === "porcentaje" && borrador.sena_valor
                    ? ` (${borrador.sena_valor}%)`
                    : ""}
                </span>
                <span className="font-semibold text-ambar">{formatPrice(montoSena)}</span>
              </div>
              <div className="flex justify-between text-lavanda">
                <span>📦 Saldo al recibir/retirar</span>
                <span>{formatPrice(montoSaldo)}</span>
              </div>
              <p className="text-xs text-lavanda/60 pt-1">
                El saldo lo abonás al momento de recibir o retirar el pedido.
              </p>
            </div>
          )}
        </section>

        {/* Turnstile */}
        {turnstileSiteKey && (
          <div className="flex justify-center">
            <Turnstile
              siteKey={turnstileSiteKey}
              onSuccess={(token) => setCaptchaToken(token)}
              options={{ theme: "dark" }}
            />
          </div>
        )}

        {error && (
          <div className="bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitting || Boolean(validacion)}
          className="w-full py-3 bg-purpura hover:bg-purpura/80 text-niebla font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? "Confirmando…"
            : tieneSena && montoSena !== null
            ? `Confirmar y pagar seña — ${formatPrice(montoSena)}`
            : `Confirmar pedido — ${formatPrice(montoAPagar)}`}
        </button>

        {validacion && !error && (
          <p className="text-xs text-lavanda/50 text-center">{validacion}</p>
        )}
      </div>

      {/* ─── Lightbox ─── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 sm:p-8"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Vista de imagen ampliada"
        >
          {/* Botón cerrar */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center transition-colors"
            aria-label="Cerrar"
          >
            ×
          </button>

          {/* Contador */}
          {lightbox.images.length > 1 && (
            <div className="absolute top-4 left-4 px-3 py-1 bg-white/10 text-white text-sm rounded-full">
              {lightbox.index + 1} / {lightbox.images.length}
            </div>
          )}

          {/* Botón anterior */}
          {lightbox.images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox({
                  ...lightbox,
                  index: (lightbox.index - 1 + lightbox.images.length) % lightbox.images.length,
                });
              }}
              className="absolute left-4 sm:left-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center transition-colors"
              aria-label="Imagen anterior"
            >
              ‹
            </button>
          )}

          {/* Imagen */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.images[lightbox.index]}
            alt={`Imagen ${lightbox.index + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-lg cursor-default"
          />

          {/* Botón siguiente */}
          {lightbox.images.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightbox({
                  ...lightbox,
                  index: (lightbox.index + 1) % lightbox.images.length,
                });
              }}
              className="absolute right-4 sm:right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center transition-colors"
              aria-label="Imagen siguiente"
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// --- Reusable inputs ---
function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-xs text-lavanda/60">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light placeholder-lavanda/30 focus:outline-none focus:border-purpura"
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="text-xs text-lavanda/60">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "Elegí..."}
          </option>
        ))}
      </select>
    </div>
  );
}

function RadioCard({
  checked,
  onClick,
  title,
  desc,
}: {
  checked: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`text-left p-3 rounded-lg border transition-colors ${
        checked
          ? "border-purpura bg-purpura/10"
          : "border-lavanda/10 hover:border-lavanda/20"
      }`}
    >
      <p className="text-sm font-medium text-niebla">{title}</p>
      <p className="text-xs text-lavanda/70 mt-0.5">{desc}</p>
    </button>
  );
}

function RadioPill({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      type="button"
      className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
        checked
          ? "border-purpura bg-purpura/20 text-ambar"
          : "border-lavanda/10 text-lavanda hover:bg-lavanda/5"
      }`}
    >
      {label}
    </button>
  );
}

function PaymentRow({
  checked,
  onClick,
  title,
  desc,
}: {
  checked: boolean;
  onClick: () => void;
  title: string;
  desc: string;
}) {
  return (
    <label
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
        checked
          ? "border-purpura bg-purpura/10"
          : "border-lavanda/10 hover:border-lavanda/20"
      }`}
    >
      <input type="radio" checked={checked} readOnly className="accent-purpura" />
      <div>
        <p className="text-sm text-niebla">{title}</p>
        <p className="text-xs text-lavanda/70">{desc}</p>
      </div>
    </label>
  );
}

// --- Hooks ---
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  const ref = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (ref.current) clearTimeout(ref.current);
    ref.current = setTimeout(() => setDebounced(value), delay);
    return () => {
      if (ref.current) clearTimeout(ref.current);
    };
  }, [value, delay]);
  return debounced;
}
