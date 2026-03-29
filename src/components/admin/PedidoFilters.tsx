"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "pendiente_pago", label: "Pendiente de pago" },
  { value: "pago_confirmado", label: "Pago confirmado" },
  { value: "en_produccion", label: "En producción" },
  { value: "impreso", label: "Impreso" },
  { value: "enviado", label: "Enviado" },
  { value: "esperando_retiro", label: "Esperando retiro" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

export default function PedidoFilters({
  currentEstado,
  currentBuscar,
}: {
  currentEstado?: string;
  currentBuscar?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [buscar, setBuscar] = useState(currentBuscar || "");

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/admin/pedidos?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParams("buscar", buscar);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <select
        value={currentEstado || ""}
        onChange={(e) => updateParams("estado", e.target.value)}
        className="px-3 py-2 bg-navy border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
      >
        {ESTADOS.map((e) => (
          <option key={e.value} value={e.value}>
            {e.label}
          </option>
        ))}
      </select>

      <form onSubmit={handleSearch} className="flex gap-2 flex-1">
        <input
          type="text"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          placeholder="Buscar por número, nombre o email..."
          className="flex-1 px-3 py-2 bg-navy border border-lavanda/20 rounded-lg text-sm text-lavanda-light placeholder-lavanda/30 focus:outline-none focus:border-purpura"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-medium rounded-lg transition-colors"
        >
          Buscar
        </button>
      </form>
    </div>
  );
}
