"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Pedido, EstadoPedido } from "@/types";

const ESTADO_LABELS: Record<EstadoPedido, string> = {
  pendiente_pago: "Pendiente de pago",
  pago_confirmado: "Pago confirmado",
  en_produccion: "En producción",
  impreso: "Impreso",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

const ESTADO_COLORS: Record<EstadoPedido, string> = {
  pendiente_pago: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  pago_confirmado: "text-green-400 bg-green-400/10 border-green-400/20",
  en_produccion: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  impreso: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  enviado: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  entregado: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  cancelado: "text-red-400 bg-red-400/10 border-red-400/20",
};

const TRANSITIONS: Record<EstadoPedido, EstadoPedido[]> = {
  pendiente_pago: ["pago_confirmado", "cancelado"],
  pago_confirmado: ["en_produccion", "cancelado"],
  en_produccion: ["impreso", "cancelado"],
  impreso: ["enviado"],
  enviado: ["entregado"],
  entregado: [],
  cancelado: [],
};

export default function PedidoActions({ pedido }: { pedido: Pedido }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [trackingCode, setTrackingCode] = useState(pedido.tracking_code || "");
  const [notas, setNotas] = useState(pedido.notas || "");

  const possibleTransitions = TRANSITIONS[pedido.estado] || [];

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
          {ESTADO_LABELS[pedido.estado]}
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
                → {ESTADO_LABELS[estado]}
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
