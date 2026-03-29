"use client";

import { useState } from "react";

export default function ContactForm() {
  const [form, setForm] = useState({ nombre: "", email: "", mensaje: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");

    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setStatus("sent");
        setForm({ nombre: "", email: "", mensaje: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 text-center">
        <p className="text-green-400 font-semibold mb-2">Mensaje enviado</p>
        <p className="text-sm text-lavanda-light">
          Te responderemos a la brevedad. Gracias por contactarnos.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 text-xs text-purpura hover:text-purpura/80 transition-colors"
        >
          Enviar otro mensaje
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-lavanda/60 mb-1">Nombre</label>
        <input
          type="text"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          required
          className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
        />
      </div>
      <div>
        <label className="block text-sm text-lavanda/60 mb-1">Email</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura"
        />
      </div>
      <div>
        <label className="block text-sm text-lavanda/60 mb-1">Mensaje</label>
        <textarea
          value={form.mensaje}
          onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
          required
          rows={5}
          className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light focus:outline-none focus:border-purpura resize-none"
        />
      </div>

      {status === "error" && (
        <p className="text-red-400 text-sm">Error al enviar. Intentá de nuevo o escribinos por WhatsApp.</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full py-2.5 bg-purpura hover:bg-purpura/80 disabled:bg-purpura/40 text-niebla font-semibold rounded-lg transition-colors"
      >
        {status === "sending" ? "Enviando..." : "Enviar mensaje"}
      </button>
    </form>
  );
}
