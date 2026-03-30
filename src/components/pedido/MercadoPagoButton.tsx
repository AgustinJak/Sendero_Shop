"use client";

import { useState } from "react";

export default function MercadoPagoButton({ pedidoId }: { pedidoId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/mercadopago/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedido_id: pedidoId }),
      });

      const data = await res.json();

      if (!res.ok || !data.init_point) {
        setError(data.error || "Error al conectar con MercadoPago");
        setLoading(false);
        return;
      }

      window.location.href = data.init_point;
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full py-3 bg-[#009ee3] hover:bg-[#0087cc] text-white font-bold rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? "Conectando con MercadoPago..." : "Pagar con MercadoPago"}
      </button>
      {error && (
        <p className="text-sm text-red-400 text-center">{error}</p>
      )}
    </div>
  );
}
