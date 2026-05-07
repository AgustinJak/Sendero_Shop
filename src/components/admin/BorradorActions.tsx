"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PedidoBorrador } from "@/types";

export default function BorradorActions({
  borrador,
  url,
}: {
  borrador: PedidoBorrador;
  url: string;
}) {
  const router = useRouter();
  const [currentUrl, setCurrentUrl] = useState(url);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isPendiente = borrador.estado === "pendiente";
  const puedeEliminar = borrador.estado === "cancelado" || borrador.estado === "expirado";

  function clearMessages() {
    setError(null);
    setInfo(null);
  }

  async function copy() {
    await navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(
      `Hola! Te paso el link de tu pedido custom para que completes tus datos:\n\n${currentUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  async function cancelar() {
    if (!confirm("¿Cancelar este borrador? El cliente no va a poder usar el link más.")) return;
    clearMessages();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/borradores/${borrador.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "cancelado" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al cancelar");
      } else {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function regenerarToken() {
    if (
      !confirm(
        "¿Regenerar el token? El link viejo deja de funcionar inmediatamente y vas a tener que pasarle el nuevo al cliente."
      )
    )
      return;
    clearMessages();
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/borradores/${borrador.id}/regenerar-token`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al regenerar token");
      } else {
        // Update URL in place sin reload completo
        const base = currentUrl.substring(0, currentUrl.lastIndexOf("/") + 1);
        setCurrentUrl(base + data.token);
        setInfo("Token regenerado. El link viejo ya no funciona.");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  async function eliminar() {
    if (!confirm("¿Eliminar definitivamente este borrador?")) return;
    clearMessages();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/borradores/${borrador.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al eliminar");
      } else {
        router.push("/admin/borradores");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* URL */}
      <div className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-3">
        <h2 className="text-sm font-semibold text-niebla">Link para compartir</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={currentUrl}
            readOnly
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="flex-1 px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-xs text-lavanda-light font-mono focus:outline-none focus:border-purpura"
          />
          <button
            onClick={copy}
            className="px-3 py-2 bg-purpura/20 hover:bg-purpura/30 text-purpura text-sm rounded-lg transition-colors whitespace-nowrap"
          >
            {copied ? "✓ Copiado" : "Copiar"}
          </button>
          <button
            onClick={shareWhatsApp}
            className="px-3 py-2 bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-sm rounded-lg transition-colors whitespace-nowrap"
          >
            WhatsApp
          </button>
        </div>

        {/* Acciones secundarias */}
        {isPendiente && (
          <div className="flex gap-2 flex-wrap pt-2 border-t border-lavanda/10">
            <button
              onClick={regenerarToken}
              disabled={loading}
              className="px-3 py-1.5 text-xs text-lavanda hover:text-niebla bg-lavanda/5 hover:bg-lavanda/10 rounded-lg transition-colors disabled:opacity-50"
            >
              Regenerar token
            </button>
            <button
              onClick={cancelar}
              disabled={loading}
              className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar borrador
            </button>
          </div>
        )}

        {puedeEliminar && (
          <div className="pt-2 border-t border-lavanda/10">
            <button
              onClick={eliminar}
              disabled={loading}
              className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 rounded-lg transition-colors disabled:opacity-50"
            >
              Eliminar definitivamente
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-2 py-1.5">
            {error}
          </p>
        )}
        {info && (
          <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-2 py-1.5">
            {info}
          </p>
        )}
      </div>
    </div>
  );
}
