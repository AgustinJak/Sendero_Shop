"use client";

import { useState, useEffect } from "react";

export default function NotificacionesAdminPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{
    sent: number;
    failed: number;
    total: number;
    cleaned?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subCount, setSubCount] = useState<number | null>(null);

  // Fetch subscription count on mount
  useEffect(() => {
    fetch("/api/admin/push/stats")
      .then((r) => r.json())
      .then((d) => setSubCount(d.count ?? null))
      .catch(() => {});
  }, [result]); // Refresh after sending

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          url: url || undefined,
          image: image || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al enviar");
        return;
      }

      setResult(data);
      // Clear form on success
      setTitle("");
      setBody("");
      setUrl("");
      setImage("");
    } catch {
      setError("Error de conexión");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-cinzel)] text-xl font-bold text-niebla">
          Notificaciones Push
        </h1>
        {subCount !== null && (
          <span className="text-sm text-lavanda/60">
            {subCount} suscriptor{subCount !== 1 ? "es" : ""}
          </span>
        )}
      </div>

      {/* Send notification form */}
      <form onSubmit={handleSend} className="bg-navy rounded-xl border border-lavanda/10 p-6 space-y-4">
        <div>
          <label className="block text-xs text-lavanda/60 mb-1">Título *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nuevo producto disponible"
            required
            maxLength={100}
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/10 rounded-lg text-sm text-niebla placeholder:text-lavanda/30 focus:outline-none focus:border-purpura"
          />
        </div>

        <div>
          <label className="block text-xs text-lavanda/60 mb-1">Mensaje *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Mirá nuestra nueva figura de Dragon Ball..."
            required
            maxLength={300}
            rows={3}
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/10 rounded-lg text-sm text-niebla placeholder:text-lavanda/30 focus:outline-none focus:border-purpura resize-none"
          />
          <span className="text-[10px] text-lavanda/30">{body.length}/300</span>
        </div>

        <div>
          <label className="block text-xs text-lavanda/60 mb-1">URL de destino (opcional)</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/producto/goku-ssj-figura"
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/10 rounded-lg text-sm text-niebla placeholder:text-lavanda/30 focus:outline-none focus:border-purpura"
          />
          <span className="text-[10px] text-lavanda/30">Ruta relativa, ej: /catalogo o /producto/slug</span>
        </div>

        <div>
          <label className="block text-xs text-lavanda/60 mb-1">Imagen (opcional)</label>
          <input
            type="url"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/10 rounded-lg text-sm text-niebla placeholder:text-lavanda/30 focus:outline-none focus:border-purpura"
          />
          <span className="text-[10px] text-lavanda/30">URL completa de una imagen para mostrar en la notificación</span>
        </div>

        {/* Preview */}
        {(title || body) && (
          <div className="bg-navy-deep rounded-lg p-4 border border-lavanda/5">
            <p className="text-[10px] text-lavanda/30 uppercase tracking-wider mb-2">Vista previa</p>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-purpura/20 flex items-center justify-center shrink-0">
                <img src="/icons/icon-192.png" alt="" className="w-6 h-6 rounded" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-niebla truncate">{title || "Título"}</p>
                <p className="text-xs text-lavanda/60 line-clamp-2">{body || "Mensaje..."}</p>
              </div>
            </div>
            {image && (
              <img src={image} alt="" className="w-full h-32 object-cover rounded-lg mt-2" />
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2 text-sm text-green-400">
            Enviado a {result.sent} de {result.total} suscriptores.
            {result.failed > 0 && ` (${result.failed} fallidos)`}
            {(result.cleaned ?? 0) > 0 && ` — ${result.cleaned} suscripciones expiradas eliminadas.`}
          </div>
        )}

        <button
          type="submit"
          disabled={sending || !title || !body}
          className="w-full py-2.5 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? "Enviando..." : "Enviar notificación"}
        </button>
      </form>
    </div>
  );
}
