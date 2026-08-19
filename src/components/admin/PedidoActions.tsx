"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Pedido, EstadoPedido } from "@/types";
import { getEstadoLabel } from "@/lib/estado-labels";
import { formatPrice } from "@/lib/utils";

const ESTADO_COLORS: Record<EstadoPedido, string> = {
  pendiente_pago: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  pago_confirmado: "text-green-400 bg-green-400/10 border-green-400/20",
  en_produccion: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  impreso: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  enviado: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  esperando_retiro: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  entregado: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  cancelado: "text-red-400 bg-red-400/10 border-red-400/20",
};

// Transiciones base — las de "impreso" se ajustan dinámicamente según método de envío
const BASE_TRANSITIONS: Record<EstadoPedido, EstadoPedido[]> = {
  pendiente_pago: ["pago_confirmado", "cancelado"],
  pago_confirmado: ["en_produccion", "cancelado"],
  en_produccion: ["impreso", "cancelado"],
  impreso: ["enviado", "esperando_retiro"], // se filtra en runtime
  enviado: ["entregado"],
  esperando_retiro: ["entregado"],
  entregado: [],
  cancelado: [],
};

function getTransitions(pedido: Pedido): EstadoPedido[] {
  const transitions = BASE_TRANSITIONS[pedido.estado] || [];
  if (pedido.estado === "impreso") {
    // Retiro en persona → solo "esperando_retiro", envío → solo "enviado"
    if (pedido.metodo_envio === "retiro") {
      return transitions.filter((t) => t !== "enviado");
    } else {
      return transitions.filter((t) => t !== "esperando_retiro");
    }
  }
  return transitions;
}

export default function PedidoActions({ pedido }: { pedido: Pedido }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [enviandoInventario, setEnviandoInventario] = useState(false);
  const [inventarioError, setInventarioError] = useState<string | null>(null);
  const [inventarioInfo, setInventarioInfo] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState(pedido.tracking_code || "");
  const [notas, setNotas] = useState(pedido.notas || "");
  const [entreCalles, setEntreCalles] = useState(pedido.entre_calles || "");

  const possibleTransitions = getTransitions(pedido);
  const yaImportado = Boolean(pedido.correo_imported_at);
  const puedeImportar =
    pedido.metodo_envio === "correo_argentino" &&
    !yaImportado &&
    pedido.estado !== "cancelado" &&
    pedido.estado !== "pendiente_pago";

  const yaEnviadoInventario = Boolean(pedido.enviado_inventario);
  const puedeEnviarInventario =
    !yaEnviadoInventario &&
    pedido.estado !== "cancelado" &&
    pedido.estado !== "pendiente_pago";

  async function importarEnvio() {
    setImporting(true);
    setImportError(null);
    try {
      const res = await fetch(`/api/admin/pedidos/${pedido.id}/importar-envio`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error || "Error al importar envío");
      } else {
        router.refresh();
      }
    } catch (err) {
      setImportError((err as Error).message);
    } finally {
      setImporting(false);
    }
  }

  async function enviarAInventario() {
    setEnviandoInventario(true);
    setInventarioError(null);
    setInventarioInfo(null);
    try {
      const res = await fetch(`/api/admin/pedidos/${pedido.id}/enviar-inventario`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setInventarioError(data.error || "Error al enviar al inventario");
        return;
      }
      // Mensajes informativos según la respuesta
      if (data.duplicate) {
        setInventarioInfo("Este pedido ya estaba en el inventario. Se sincronizó el ID.");
      } else if (data.warnings && data.warnings.length > 0) {
        setInventarioInfo(
          `Enviado con ${data.warnings.length} advertencia(s) — revisalo en el inventario.`
        );
      }
      router.refresh();
    } catch (err) {
      setInventarioError((err as Error).message);
    } finally {
      setEnviandoInventario(false);
    }
  }

  async function updatePedido(updates: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pedidos/${pedido.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Estado actual */}
      <div className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-niebla">Estado</h2>
        <div className={`inline-block text-sm px-3 py-1 rounded-full border ${ESTADO_COLORS[pedido.estado]}`}>
          {getEstadoLabel(pedido.estado, pedido.metodo_pago)}
        </div>

        {possibleTransitions.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-xs text-lavanda/40">Cambiar a:</p>
            {possibleTransitions.map((estado) => (
              <button
                key={estado}
                onClick={() => updatePedido({ estado })}
                disabled={loading}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors disabled:opacity-50 ${
                  estado === "cancelado"
                    ? "border-red-400/20 text-red-400 hover:bg-red-400/10"
                    : "border-lavanda/10 text-lavanda-light hover:bg-lavanda/5"
                }`}
              >
                → {getEstadoLabel(estado, pedido.metodo_pago)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info pago */}
      <div className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-2">
        <h2 className="text-sm font-semibold text-niebla">Pago</h2>
        <p className="text-sm text-lavanda-light capitalize">
          {pedido.metodo_pago === "mercadopago" ? "MercadoPago" : pedido.metodo_pago}
        </p>
        {pedido.mp_payment_id && (
          <p className="text-xs text-lavanda/40">
            Payment ID: <span className="font-mono">{pedido.mp_payment_id}</span>
          </p>
        )}
      </div>

      {/* Importar a MiCorreo (solo Correo Argentino) */}
      {pedido.metodo_envio === "correo_argentino" && (
        <div className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-niebla">MiCorreo</h2>
            {yaImportado && (
              <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                Importado
              </span>
            )}
          </div>

          {yaImportado ? (
            <div className="space-y-1 text-xs">
              {pedido.correo_shipping_id && (
                <>
                  <p className="text-lavanda/60">Shipping ID</p>
                  <p className="text-lavanda-light font-mono">{pedido.correo_shipping_id}</p>
                </>
              )}
              {pedido.correo_imported_at && (
                <p className="text-lavanda/40 pt-1">
                  Importado el {new Date(pedido.correo_imported_at).toLocaleString("es-AR")}
                </p>
              )}
            </div>
          ) : (
            <>
              <p className="text-xs text-lavanda/60">
                Importar este envío a la plataforma de Correo Argentino para gestionarlo.
              </p>
              <button
                onClick={importarEnvio}
                disabled={importing || loading || !puedeImportar}
                className="w-full py-2 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={!puedeImportar ? "El pedido debe tener el pago confirmado y método Correo Argentino" : undefined}
              >
                {importing ? "Importando..." : "Importar a MiCorreo"}
              </button>
              {importError && (
                <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-2 py-1.5">
                  {importError}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Seña / Saldo (solo si el pedido tiene seña) */}
      {pedido.tiene_sena && pedido.monto_sena !== null && (
        <div className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-niebla">Seña / Saldo</h2>

          {/* Seña */}
          <div className="bg-navy-deep rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-lavanda/60">Seña</span>
              <span className="text-xs text-niebla font-semibold">
                {formatPrice(Number(pedido.monto_sena))}
              </span>
            </div>
            {pedido.sena_pagada ? (
              <div className="space-y-1">
                <span className="inline-block text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                  ✓ Pagada
                </span>
                {pedido.sena_pagada_at && (
                  <p className="text-xs text-lavanda/40">
                    {new Date(pedido.sena_pagada_at).toLocaleString("es-AR")}
                  </p>
                )}
                <button
                  onClick={() => updatePedido({ sena_pagada: false })}
                  disabled={loading}
                  className="text-xs text-lavanda/40 hover:text-lavanda underline transition-colors disabled:opacity-50"
                >
                  Desmarcar
                </button>
              </div>
            ) : (
              <button
                onClick={() => updatePedido({ sena_pagada: true })}
                disabled={loading}
                className="w-full py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Marcar seña como pagada
              </button>
            )}
          </div>

          {/* Saldo */}
          <div className="bg-navy-deep rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-lavanda/60">Saldo al entregar</span>
              <span className="text-xs text-niebla font-semibold">
                {formatPrice(Number(pedido.total) - Number(pedido.monto_sena))}
              </span>
            </div>
            {pedido.saldo_pagado ? (
              <div className="space-y-1">
                <span className="inline-block text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
                  ✓ Pagado
                </span>
                {pedido.saldo_pagado_at && (
                  <p className="text-xs text-lavanda/40">
                    {new Date(pedido.saldo_pagado_at).toLocaleString("es-AR")}
                  </p>
                )}
                <button
                  onClick={() => updatePedido({ saldo_pagado: false })}
                  disabled={loading}
                  className="text-xs text-lavanda/40 hover:text-lavanda underline transition-colors disabled:opacity-50"
                >
                  Desmarcar
                </button>
              </div>
            ) : (
              <button
                onClick={() => updatePedido({ saldo_pagado: true })}
                disabled={loading || !pedido.sena_pagada}
                className="w-full py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={!pedido.sena_pagada ? "Marcá la seña como pagada primero" : undefined}
              >
                Marcar saldo como pagado
              </button>
            )}
          </div>
        </div>
      )}

      {/* Inventario Sendero 3D */}
      <div className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-niebla">Inventario</h2>
          {yaEnviadoInventario && (
            <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
              Enviado
            </span>
          )}
        </div>

        {yaEnviadoInventario ? (
          <div className="space-y-1 text-xs">
            {pedido.inventario_pedido_id && (
              <>
                <p className="text-lavanda/60">Pedido ID</p>
                <p className="text-lavanda-light font-mono">{pedido.inventario_pedido_id}</p>
              </>
            )}
            {pedido.inventario_enviado_en && (
              <p className="text-lavanda/40 pt-1">
                Enviado el {new Date(pedido.inventario_enviado_en).toLocaleString("es-AR")}
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-lavanda/60">
              Enviar este pedido al sistema de inventario para gestionarlo desde ahí.
            </p>
            <button
              onClick={enviarAInventario}
              disabled={enviandoInventario || loading || !puedeEnviarInventario}
              className="w-full py-2 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={!puedeEnviarInventario ? "El pedido tiene que estar confirmado y no cancelado" : undefined}
            >
              {enviandoInventario ? "Enviando..." : "Enviar al inventario"}
            </button>
            {inventarioError && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-2 py-1.5">
                {inventarioError}
              </p>
            )}
            {inventarioInfo && (
              <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-2 py-1.5">
                {inventarioInfo}
              </p>
            )}
          </>
        )}
      </div>

      {/* Etiqueta de envío */}
      <div className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-niebla">Etiqueta de envío</h2>
        <p className="text-xs text-lavanda/60">
          Rótulo de 10×15 cm para mensajería en CABA y GBA.
        </p>

        <div className="space-y-1.5">
          <label className="block text-xs text-lavanda/60">Entre calles</label>
          <input
            type="text"
            value={entreCalles}
            onChange={(e) => setEntreCalles(e.target.value)}
            placeholder="Ej: Av. Rivadavia y Medrano"
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light placeholder-lavanda/30 focus:outline-none focus:border-purpura"
          />
          {entreCalles !== (pedido.entre_calles || "") && (
            <button
              onClick={() => updatePedido({ entre_calles: entreCalles })}
              disabled={loading}
              className="w-full py-2 bg-purpura/20 hover:bg-purpura/30 text-purpura text-xs rounded-lg transition-colors disabled:opacity-50"
            >
              Guardar entre calles
            </button>
          )}
        </div>

        {/* Enlace normal y no fetch: el navegador maneja la descarga solo y no
            hay que sostener el PDF en memoria ni armar un blob. */}
        <a
          href={`/api/admin/pedidos/${pedido.id}/etiqueta`}
          className="block w-full py-2 bg-ambar/15 hover:bg-ambar/25 text-ambar text-sm font-medium text-center rounded-lg transition-colors"
        >
          Generar etiqueta (PDF)
        </a>

        {!pedido.telefono && (
          <p className="text-xs text-yellow-400">
            Este pedido no tiene teléfono cargado y la etiqueta va a salir sin
            ese dato.
          </p>
        )}
      </div>

      {/* Tracking */}
      <div className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-niebla">Tracking</h2>
        <input
          type="text"
          value={trackingCode}
          onChange={(e) => setTrackingCode(e.target.value)}
          placeholder="Código de seguimiento"
          className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light placeholder-lavanda/30 focus:outline-none focus:border-purpura"
        />
        <button
          onClick={() => updatePedido({ tracking_code: trackingCode })}
          disabled={loading}
          className="w-full py-2 bg-purpura/20 hover:bg-purpura/30 text-purpura text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          Guardar tracking
        </button>
      </div>

      {/* Notas */}
      <div className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-niebla">Notas internas</h2>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={3}
          placeholder="Notas sobre este pedido..."
          className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light placeholder-lavanda/30 focus:outline-none focus:border-purpura resize-none"
        />
        <button
          onClick={() => updatePedido({ notas })}
          disabled={loading}
          className="w-full py-2 bg-purpura/20 hover:bg-purpura/30 text-purpura text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          Guardar notas
        </button>
      </div>

      {/* Delete (only cancelled) */}
      {pedido.estado === "cancelado" && (
        <div className="bg-red-500/5 rounded-xl border border-red-500/10 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-red-400">Eliminar pedido</h2>
          <p className="text-xs text-lavanda/40">
            Este pedido está cancelado. Los pedidos cancelados se eliminan automáticamente después de 48h.
          </p>
          <button
            onClick={async () => {
              if (!confirm("¿Eliminar este pedido permanentemente?")) return;
              setLoading(true);
              try {
                const res = await fetch(`/api/admin/pedidos/${pedido.id}`, { method: "DELETE" });
                if (res.ok) router.push("/admin/pedidos");
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded-lg transition-colors disabled:opacity-50"
          >
            Eliminar permanentemente
          </button>
        </div>
      )}
    </>
  );
}
