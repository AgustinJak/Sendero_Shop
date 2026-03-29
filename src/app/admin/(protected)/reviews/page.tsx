import { createServiceRoleClient } from "@/lib/supabase-server";
import type { Review } from "@/types";
import ReviewsManager from "@/components/admin/ReviewsManager";

export default async function AdminReviewsPage() {
  const supabase = await createServiceRoleClient();

  const { data } = await supabase
    .from("reviews")
    .select("*, producto:productos(nombre, slug)")
    .order("created_at", { ascending: false });

  const reviews = (data || []) as Review[];
  const pendientes = reviews.filter((r) => !r.aprobado).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-cinzel)] text-2xl font-bold text-niebla">
            Reseñas
          </h1>
          <p className="text-sm text-lavanda/60 mt-1">
            {reviews.length} reseña{reviews.length !== 1 ? "s" : ""} total{reviews.length !== 1 ? "es" : ""}
            {pendientes > 0 && (
              <span className="text-ambar ml-1">· {pendientes} pendiente{pendientes !== 1 ? "s" : ""}</span>
            )}
          </p>
        </div>
      </div>

      <ReviewsManager reviews={reviews} />
    </div>
  );
}
