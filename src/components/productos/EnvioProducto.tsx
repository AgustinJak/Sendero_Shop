"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";

interface CotizOpcion {
  precio: number;
  producto?: string;
  tiempoMin?: number | null;
  tiempoMax?: number | null;
}

interface Cotizacion {
  domicilio: CotizOpcion | null;
  sucursal: CotizOpcion | null;
}

interface EnvioProductoProps {
  /** Umbral de envío gratis (ARS). 0 = desactivado. */
  envioGratisDesde: number;
  /** Precio final del producto (para saber si califica solo). */
  precio: number;
  /** Dimensiones del paquete para cotizar. */
  paquete?: {
    weight?: number;
    height?: number;
    width?: number;
    length?: number;
  };
}

function TruckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 17h4V5H2v12h3" />
      <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
      <circle cx="7.5" cy="17.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );
}

export default function EnvioProducto({
  envioGratisDesde,
  precio,
  paquete,
}: EnvioProductoProps) {
  const [cp, setCp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Cotizacion | null>(null);

  const envioGratisActivo = envioGratisDesde > 0;
  const productoCalifica = envioGratisActivo && precio >= envioGratisDesde;

  async function calcular(e: React.FormEvent) {
    e.preventDefault();
    if (cp.trim().replace(/\D/g, "").length < 4) {
      setError("Ingresá un código postal válido");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/envios/cotizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigoPostal: cp, paquete }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cotizar el envío");
        return;
      }
      if (!data.domicilio && !data.sucursal) {
        setError("No hay envíos disponibles para ese código postal");
        return;
      }
      setResult(data);
    } catch {
      setError("No se pudo cotizar. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-linea bg-navy-deep/40 p-4 space-y-3">
      {/* Encabezado: da contexto de qué resuelve este bloque y absorbe el
          "a todo el país" que antes duplicaba TrustBadges. */}
      <div className="flex items-center gap-2.5">
        <TruckIcon className="h-5 w-5 shrink-0 text-lavanda" />
        <p className="text-sm text-lavanda-light">
          Envíos a <span className="font-medium text-niebla">todo el país</span>
          <span className="text-texto-3"> · Correo Argentino</span>
        </p>
      </div>

      {/* Tarjeta de envío gratis */}
      {envioGratisActivo && (
        <div
          className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm ${
            productoCalifica
              ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-400"
              : "bg-navy/50 border border-linea text-lavanda-light"
          }`}
        >
          {/* Sin camión acá: ya está en el encabezado del bloque. */}
          {productoCalifica ? (
            <span>
              <strong className="font-semibold">
                🎉 ¡Este producto tiene envío gratis!
              </strong>
            </span>
          ) : (
            <span>
              Envío{" "}
              <strong className="font-semibold text-niebla">gratis</strong> en
              compras desde {formatPrice(envioGratisDesde)}
            </span>
          )}
        </div>
      )}

      {/* Calculadora de envío */}
      <div>
        <label
          htmlFor="cp-envio"
          className="block text-xs text-texto-3 mb-1.5"
        >
          Calculá el costo de envío
        </label>
        <form onSubmit={calcular} className="flex gap-2">
          <input
            id="cp-envio"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            value={cp}
            onChange={(e) => setCp(e.target.value)}
            placeholder="Tu código postal"
            className="flex-1 min-w-0 rounded-lg bg-navy border border-linea px-3 py-2 text-sm text-niebla placeholder:text-texto-3 focus:outline-none focus:border-purpura/60"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-lg bg-purpura px-4 py-2 text-sm font-medium text-niebla transition-colors hover:bg-purpura/80 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "..." : "Calcular"}
          </button>
        </form>

        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        {result && (
          <div className="mt-3 space-y-2">
            {result.domicilio && (
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-lavanda-light">Envío a domicilio</span>
                  {(result.domicilio.tiempoMin || result.domicilio.tiempoMax) && (
                    <span className="block text-xs text-texto-3">
                      Llega en {result.domicilio.tiempoMin ?? ""}
                      {result.domicilio.tiempoMin && result.domicilio.tiempoMax
                        ? "–"
                        : ""}
                      {result.domicilio.tiempoMax ?? ""} días hábiles
                    </span>
                  )}
                </div>
                <PrecioEnvio precio={result.domicilio.precio} gratis={productoCalifica} />
              </div>
            )}
            {result.sucursal && (
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-lavanda-light">
                    Retiro en sucursal de Correo Argentino
                  </span>
                  {(result.sucursal.tiempoMin || result.sucursal.tiempoMax) && (
                    <span className="block text-xs text-texto-3">
                      Llega en {result.sucursal.tiempoMin ?? ""}
                      {result.sucursal.tiempoMin && result.sucursal.tiempoMax
                        ? "–"
                        : ""}
                      {result.sucursal.tiempoMax ?? ""} días hábiles
                    </span>
                  )}
                </div>
                <PrecioEnvio precio={result.sucursal.precio} gratis={productoCalifica} />
              </div>
            )}
            <p className="text-[11px] text-texto-3 pt-1">
              Costo estimado con Correo Argentino. El valor final se confirma en
              el checkout.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function PrecioEnvio({ precio, gratis }: { precio: number; gratis: boolean }) {
  if (gratis) {
    return (
      <span className="text-right">
        <span className="mr-1.5 text-xs text-texto-3 line-through">
          {formatPrice(precio)}
        </span>
        <span className="font-semibold text-emerald-400">GRATIS</span>
      </span>
    );
  }
  return <span className="font-semibold text-niebla">{formatPrice(precio)}</span>;
}
