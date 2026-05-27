"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function NuevaMayoristaForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleNombreChange(val: string) {
    setNombre(val);
    setCodigo(toSlug(val));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre || !codigo) return;
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/mayoristas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, codigo }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Error al crear la lista");
      return;
    }

    router.push(`/admin/mayoristas/${data.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-navy border border-lavanda/10 rounded-xl p-6 space-y-4">
      <div>
        <label className="block text-xs text-lavanda/60 mb-1">Nombre interno</label>
        <input
          value={nombre}
          onChange={(e) => handleNombreChange(e.target.value)}
          placeholder="Ej: Lista verano 2026"
          required
          className="w-full bg-navy-deep border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla focus:outline-none focus:border-purpura"
        />
      </div>

      <div>
        <label className="block text-xs text-lavanda/60 mb-1">
          Código URL <span className="text-lavanda/40">(auto-generado, editable)</span>
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-lavanda/40 shrink-0">/mayorista/</span>
          <input
            value={codigo}
            onChange={(e) => setCodigo(toSlug(e.target.value))}
            placeholder="lista-verano-2026"
            required
            className="flex-1 bg-navy-deep border border-lavanda/20 rounded-lg px-3 py-2 text-sm text-niebla font-mono focus:outline-none focus:border-purpura"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || !nombre || !codigo}
          className="flex-1 py-2 bg-purpura hover:bg-purpura/80 text-niebla font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Creando..." : "Crear y editar →"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/mayoristas")}
          className="px-5 py-2 border border-lavanda/20 text-lavanda-light rounded-lg hover:bg-lavanda/10 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
