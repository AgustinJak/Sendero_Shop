"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Lista = {
  id: string;
  codigo: string;
  nombre: string;
  activa: boolean;
  created_at: string;
  secciones: { id: string }[];
};

export default function MayoristaListaAdmin({ listas }: { listas: Lista[] }) {
  const router = useRouter();
  const [copying, setCopying] = useState<string | null>(null);

  async function toggleActiva(lista: Lista) {
    await fetch(`/api/admin/mayoristas/${lista.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activa: !lista.activa }),
    });
    router.refresh();
  }

  async function handleDelete(lista: Lista) {
    if (!confirm(`¿Eliminar la lista "${lista.nombre}"? Esto no se puede deshacer.`)) return;
    await fetch(`/api/admin/mayoristas/${lista.id}`, { method: "DELETE" });
    router.refresh();
  }

  function copyLink(codigo: string) {
    const url = `${window.location.origin}/mayorista/${codigo}`;
    navigator.clipboard.writeText(url);
    setCopying(codigo);
    setTimeout(() => setCopying(null), 2000);
  }

  if (listas.length === 0) {
    return (
      <div className="bg-navy border border-lavanda/10 rounded-xl p-12 text-center">
        <p className="text-lavanda/40 text-sm">No hay listas mayoristas</p>
        <Link href="/admin/mayoristas/nueva" className="mt-3 inline-block text-ambar text-sm hover:underline">
          Crear la primera →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listas.map((lista) => (
        <div
          key={lista.id}
          className="bg-navy border border-lavanda/10 rounded-xl p-4 flex items-center gap-4"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-niebla font-medium">{lista.nombre}</h3>
              <span className="text-xs text-lavanda/40 font-mono">/mayorista/{lista.codigo}</span>
              {!lista.activa && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">inactiva</span>
              )}
            </div>
            <p className="text-xs text-lavanda/40 mt-0.5">
              {lista.secciones?.length ?? 0} secciones ·{" "}
              {new Date(lista.created_at).toLocaleDateString("es-AR")}
            </p>
          </div>

          <div className="flex gap-2 shrink-0 flex-wrap justify-end">
            <button
              onClick={() => copyLink(lista.codigo)}
              className="text-xs px-3 py-1 border border-lavanda/20 rounded-lg text-lavanda-light hover:bg-lavanda/10 transition-colors"
            >
              {copying === lista.codigo ? "¡Copiado!" : "Copiar link"}
            </button>
            <Link
              href={`/mayorista/${lista.codigo}`}
              target="_blank"
              className="text-xs px-3 py-1 border border-lavanda/20 rounded-lg text-lavanda-light hover:bg-lavanda/10 transition-colors"
            >
              Ver
            </Link>
            <Link
              href={`/admin/mayoristas/${lista.id}`}
              className="text-xs px-3 py-1 border border-ambar/30 rounded-lg text-ambar hover:bg-ambar/10 transition-colors"
            >
              Editar
            </Link>
            <button
              onClick={() => toggleActiva(lista)}
              className="text-xs px-3 py-1 border border-lavanda/20 rounded-lg text-lavanda-light hover:bg-lavanda/10 transition-colors"
            >
              {lista.activa ? "Desactivar" : "Activar"}
            </button>
            <button
              onClick={() => handleDelete(lista)}
              className="text-xs px-3 py-1 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
