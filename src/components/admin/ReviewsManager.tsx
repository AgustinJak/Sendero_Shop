"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import StarRating from "@/components/reviews/StarRating";
import type { Review } from "@/types";

type FilterStatus = "todas" | "pendientes" | "aprobadas";

export default function ReviewsManager({ reviews: initialReviews }: { reviews: Review[] }) {
  const router = useRouter();
  const [reviews, setReviews] = useState(initialReviews);
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("todas");

  const pendientes = reviews.filter((r) => !r.aprobado).length;
  const aprobadas = reviews.filter((r) => r.aprobado).length;

  const filteredReviews = reviews.filter((r) => {
    if (filter === "pendientes") return !r.aprobado;
    if (filter === "aprobadas") return r.aprobado;
    return true;
  });

  async function toggleAprobado(id: string, aprobado: boolean) {
    setLoading(id);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, aprobado }),
      });
      if (res.ok) {
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, aprobado } : r))
        );
      }
    } finally {
      setLoading(null);
    }
  }

  async function deleteReview(id: string) {
    if (!confirm("¿Eliminar esta reseña permanentemente?")) return;
    setLoading(id);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setReviews((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex gap-2">
        {([
          { key: "todas" as FilterStatus, label: "Todas", count: reviews.length },
          { key: "pendientes" as FilterStatus, label: "Pendientes", count: pendientes },
          { key: "aprobadas" as FilterStatus, label: "Aprobadas", count: aprobadas },
        ]).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-purpura text-niebla"
                : "bg-lavanda/5 text-lavanda-light hover:bg-lavanda/10"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Lista */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lavanda/40 text-sm">No hay reseñas {filter !== "todas" ? `${filter}` : ""}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className={`bg-navy rounded-xl border p-4 space-y-2 ${
                review.aprobado ? "border-green-500/20" : "border-ambar/20"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-niebla">{review.nombre_cliente}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      review.aprobado
                        ? "bg-green-400/10 text-green-400"
                        : "bg-ambar/10 text-ambar"
                    }`}>
                      {review.aprobado ? "Aprobada" : "Pendiente"}
                    </span>
                  </div>
                  <p className="text-xs text-lavanda/40">{review.email}</p>
                </div>
                <StarRating rating={review.rating} size="sm" />
              </div>

              {/* Producto */}
              {review.producto && (
                <p className="text-xs text-lavanda/50">
                  Producto:{" "}
                  <a
                    href={`/producto/${review.producto.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purpura hover:underline"
                  >
                    {review.producto.nombre}
                  </a>
                </p>
              )}

              {/* Comentario */}
              {review.comentario && (
                <p className="text-sm text-lavanda-light">{review.comentario}</p>
              )}

              {/* Fecha */}
              <p className="text-xs text-lavanda/30">
                {new Date(review.created_at).toLocaleDateString("es-AR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>

              {/* Acciones */}
              <div className="flex gap-2 pt-1">
                {!review.aprobado ? (
                  <button
                    onClick={() => toggleAprobado(review.id, true)}
                    disabled={loading === review.id}
                    className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs rounded-lg transition-colors disabled:opacity-50"
                  >
                    Aprobar
                  </button>
                ) : (
                  <button
                    onClick={() => toggleAprobado(review.id, false)}
                    disabled={loading === review.id}
                    className="px-3 py-1 bg-ambar/20 hover:bg-ambar/30 text-ambar text-xs rounded-lg transition-colors disabled:opacity-50"
                  >
                    Ocultar
                  </button>
                )}
                <button
                  onClick={() => deleteReview(review.id)}
                  disabled={loading === review.id}
                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
