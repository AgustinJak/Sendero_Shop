"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OrderLookupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [numeroPedido, setNumeroPedido] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/pedidos/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, numero_pedido: numeroPedido }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "No encontramos tu pedido");
        return;
      }

      const { id } = await res.json();
      router.push(`/pedido/${id}`);
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm text-lavanda/75 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          className="w-full px-4 py-3 bg-navy-deep border border-lavanda/20 rounded-lg text-niebla placeholder:text-lavanda/50 focus:outline-none focus:border-purpura transition-colors"
        />
      </div>

      <div>
        <label htmlFor="numero" className="block text-sm text-lavanda/75 mb-1">
          Número de pedido
        </label>
        <input
          id="numero"
          type="text"
          required
          value={numeroPedido}
          onChange={(e) => setNumeroPedido(e.target.value)}
          placeholder="SS-00001"
          className="w-full px-4 py-3 bg-navy-deep border border-lavanda/20 rounded-lg text-niebla placeholder:text-lavanda/50 focus:outline-none focus:border-purpura transition-colors uppercase"
        />
      </div>

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-purpura hover:bg-purpura/80 disabled:opacity-50 text-niebla font-semibold rounded-lg transition-colors"
      >
        {loading ? "Buscando..." : "Buscar pedido"}
      </button>
    </form>
  );
}
