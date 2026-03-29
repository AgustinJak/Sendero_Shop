"use client";

import { useState } from "react";
import StarRating from "./StarRating";

interface ReviewFormProps {
  productoId: string;
}

export default function ReviewForm({ productoId }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [comentario, setComentario] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error" | "duplicate" | "no_compra">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (rating === 0) {
      alert("Seleccioná una calificación");
      return;
    }

    setStatus("sending");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto_id: productoId,
          nombre_cliente: nombre,
          email,
          rating,
          comentario: comentario || null,
        }),
      });

      if (res.status === 403) {
        setStatus("no_compra");
        return;
      }

      if (res.status === 409) {
        setStatus("duplicate");
        return;
      }

      if (res.ok) {
        setStatus("sent");
        setRating(0);
        setNombre("");
        setEmail("");
        setComentario("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
        <p className="text-green-400 font-semibold mb-1">¡Gracias por tu reseña!</p>
        <p className="text-sm text-lavanda-light">
          Tu reseña será publicada después de ser revisada.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-3 text-xs text-purpura hover:text-purpura/80 transition-colors"
        >
          Escribir otra reseña
        </button>
      </div>
    );
  }

  if (status === "duplicate") {
    return (
      <div className="bg-ambar/10 border border-ambar/20 rounded-xl p-6 text-center">
        <p className="text-ambar font-semibold mb-1">Ya dejaste una reseña</p>
        <p className="text-sm text-lavanda-light">
          Solo se permite una reseña por producto.
        </p>
      </div>
    );
  }

  if (status === "no_compra") {
    return (
      <div className="bg-ambar/10 border border-ambar/20 rounded-xl p-6 text-center">
        <p className="text-ambar font-semibold mb-1">No encontramos una compra con ese email</p>
        <p className="text-sm text-lavanda-light">
          Solo clientes que recibieron este producto pueden dejar una reseña. Asegurate de usar el mismo email con el que hiciste tu pedido.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-3 text-xs text-purpura hover:text-purpura/80 transition-colors"
        >
          Intentar con otro email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Rating */}
      <div>
        <label className="block text-sm text-lavanda/60 mb-2">Calificación</label>
        <StarRating rating={rating} size="lg" interactive onChange={setRating} />
      </div>

      {/* Nombre y email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-lavanda/60 mb-1">Nombre</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            placeholder="Tu nombre"
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light placeholder-lavanda/30 focus:outline-none focus:border-purpura"
          />
        </div>
        <div>
          <label className="block text-sm text-lavanda/60 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="tu@email.com"
            className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light placeholder-lavanda/30 focus:outline-none focus:border-purpura"
          />
          <p className="text-xs text-lavanda/30 mt-1">No se mostrará públicamente</p>
        </div>
      </div>

      {/* Comentario */}
      <div>
        <label className="block text-sm text-lavanda/60 mb-1">Comentario (opcional)</label>
        <textarea
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          rows={3}
          placeholder="Contanos tu experiencia con el producto..."
          className="w-full px-3 py-2 bg-navy-deep border border-lavanda/20 rounded-lg text-sm text-lavanda-light placeholder-lavanda/30 focus:outline-none focus:border-purpura resize-none"
        />
      </div>

      {status === "error" && (
        <p className="text-red-400 text-sm">Error al enviar. Intentá de nuevo.</p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full py-2.5 bg-purpura hover:bg-purpura/80 disabled:bg-purpura/40 text-niebla font-semibold rounded-lg transition-colors"
      >
        {status === "sending" ? "Enviando..." : "Enviar reseña"}
      </button>
    </form>
  );
}
