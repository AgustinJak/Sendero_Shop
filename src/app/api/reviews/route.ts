import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { dentroDelLimite, huella, ipDe } from "@/lib/limite";
import { esEmailValido } from "@/lib/email/seguridad";

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
    console.error("[Reviews] Select error:", error.message);
    return NextResponse.json({ error: "No pudimos cargar las reseñas" }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/reviews — crear review (público)
export async function POST(req: NextRequest) {
  // Cada intento consulta los pedidos de un email: con tope, no sirve para
  // averiguar quién compró qué probando emails (SHOP - Seguridad, punto 7).
  if (!(await dentroDelLimite(`resena:ip:1h:${huella(ipDe(req))}`, 5, 3600))) {
    return NextResponse.json({ error: "Hiciste varios intentos seguidos. Probá más tarde." }, { status: 429 });
  }

  const body = await req.json();
  const { producto_id, rating } = body;
  const nombre_cliente = typeof body.nombre_cliente === "string" ? body.nombre_cliente.replace(/\s+/g, " ").trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const comentario = typeof body.comentario === "string" ? body.comentario.trim() : "";

  if (typeof producto_id !== "string" || !producto_id || !nombre_cliente || !email || !rating) {
    return NextResponse.json({ error: "Campos requeridos: producto_id, nombre_cliente, email, rating" }, { status: 400 });
  }

  if (!Number.isInteger(Number(rating)) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating debe ser entre 1 y 5" }, { status: 400 });
  }

  if (!esEmailValido(email)) {
    return NextResponse.json({ error: "El email no es válido" }, { status: 400 });
  }

  if (nombre_cliente.length > 80 || comentario.length > 2000) {
    return NextResponse.json({ error: "El nombre o el comentario son demasiado largos" }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  // Verificar que el email tenga un pedido entregado con este producto
  const { data: pedidosEntregados } = await supabase
    .from("pedidos")
    .select("id, items:pedido_items(producto_id)")
    .eq("email", email)
    .eq("estado", "entregado");

  const tieneCompra = pedidosEntregados?.some((pedido) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pedido.items as any[])?.some((item: { producto_id: string }) => item.producto_id === producto_id)
  );

  if (!tieneCompra) {
    return NextResponse.json(
      { error: "Solo clientes que recibieron este producto pueden dejar una reseña." },
      { status: 403 }
    );
  }

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

  // Buscar el pedido_id correspondiente
  const pedidoMatch = pedidosEntregados?.find((pedido) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pedido.items as any[])?.some((item: { producto_id: string }) => item.producto_id === producto_id)
  );

  const { error } = await supabase.from("reviews").insert({
    producto_id,
    pedido_id: pedidoMatch?.id || null,
    nombre_cliente,
    email,
    rating: Number(rating),
    comentario: comentario || null,
    aprobado: false,
  });

  if (error) {
    console.error("[Reviews] Insert error:", error.message);
    return NextResponse.json({ error: "No pudimos guardar la reseña" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Reseña enviada. Será revisada antes de publicarse." });
}
