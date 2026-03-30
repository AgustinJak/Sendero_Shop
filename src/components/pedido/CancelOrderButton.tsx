"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelOrderButton({ pedidoId, email }: { pedidoId: string; email: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCancel() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/pedidos/${pedidoId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "No se pudo cancelar el pedido");
        setConfirming(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-sm text-red-400/60 hover:text-red-400 transition-colors underline underline-offset-2"
      >
        Cancelar pedido
      </button>
    );
  }

  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-3">
      <p className="text-sm text-red-300">
        ¿Estás seguro de que querés cancelar este pedido? Esta acción no se puede deshacer.
      </p>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {loading ? "Cancelando..." : "Sí, cancelar"}
        </button>
        <button
          onClick={() => { setConfirming(false); setError(""); }}
          disabled={loading}
          className="px-4 py-2 bg-lavanda/10 hover:bg-lavanda/20 text-lavanda text-sm rounded-lg transition-colors"
        >
          No, volver
        </button>
      </div>
    </div>
  );
}
