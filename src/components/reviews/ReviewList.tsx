"use client";

import { useEffect, useState } from "react";
import StarRating from "./StarRating";
import ReviewForm from "./ReviewForm";

interface ReviewData {
  id: string;
  nombre_cliente: string;
  rating: number;
  comentario: string | null;
  created_at: string;
}

export default function ReviewList({ productoId }: { productoId: string }) {
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews?producto_id=${productoId}`)
      .then((r) => r.json())
      .then((data) => {
        setReviews(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [productoId]);

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
      : 0;

  return (
    <div className="mt-12 border-t border-linea pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-texto">
            Reseñas
          </h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={Math.round(avgRating)} size="sm" />
              <span className="text-sm text-texto-3">
                {avgRating.toFixed(1)} ({reviews.length}{" "}
                {reviews.length === 1 ? "reseña" : "reseñas"})
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-purpura/20 hover:bg-purpura/30 text-ambar text-sm font-medium rounded-lg transition-colors"
        >
          {showForm ? "Cancelar" : "Escribir reseña"}
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="mb-8 bg-navy rounded-xl border border-linea p-6">
          <ReviewForm productoId={productoId} />
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-navy/50 rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-lavanda/10 rounded w-1/4 mb-3" />
              <div className="h-3 bg-lavanda/10 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-texto-3 text-sm">
            Todavía no hay reseñas para este producto.
          </p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-sm text-ambar hover:text-ambar-light transition-colors"
            >
              Sé el primero en dejar una reseña
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-navy/50 rounded-xl border border-lavanda/5 p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {/* Avatar inicial */}
                  <div className="w-8 h-8 rounded-full bg-purpura/20 flex items-center justify-center text-sm font-bold text-ambar">
                    {review.nombre_cliente.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-niebla">
                      {review.nombre_cliente}
                    </p>
                    <p className="text-xs text-texto-3">
                      {new Date(review.created_at).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <StarRating rating={review.rating} size="sm" />
              </div>
              {review.comentario && (
                <p className="text-sm text-lavanda-light mt-2 leading-relaxed">
                  {review.comentario}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
