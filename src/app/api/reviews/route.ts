import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";

// GET /api/reviews?producto_id=xxx — reviews aprobados de un producto
export async function GET(req: NextRequest) {
  const productoId = req.nextUrl.searchParams.get("producto_id");

  if (!productoId) {
    return NextResponse.json({ error: "producto_id requerido" }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, nombre_cliente, rating, comentario, created_at")
    .eq("producto_id", productoId)
    .eq("aprobado", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/reviews — crear review (público)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { producto_id, nombre_cliente, email, rating, comentario, pedido_id } = body;

  if (!producto_id || !nombre_cliente || !email || !rating) {
    return NextResponse.json({ error: "Campos requeridos: producto_id, nombre_cliente, email, rating" }, { status: 400 });
  }

  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating debe ser entre 1 y 5" }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  // Verificar que no tenga ya un review para este producto con el mismo email
  const { data: existing } = await supabase
    .from("reviews")
    .select("id")
    .eq("producto_id", producto_id)
    .eq("email", email)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "Ya dejaste una reseña para este producto" }, { status: 409 });
  }

  const { error } = await supabase.from("reviews").insert({
    producto_id,
    pedido_id: pedido_id || null,
    nombre_cliente,
    email,
    rating: Number(rating),
    comentario: comentario || null,
    aprobado: false,
  });

  if (error) {
    console.error("[Reviews] Insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Reseña enviada. Será revisada antes de publicarse." });
}
