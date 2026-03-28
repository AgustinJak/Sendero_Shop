import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email/send";
import { pagoRecibidoEmail, pedidoEnviadoEmail, pedidoCanceladoEmail } from "@/lib/email/templates";
import type { Pedido } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify user is authenticated
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Only allow updating specific fields
    const allowedFields = ["estado", "tracking_code", "tracking_url", "notas"];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (updates.estado === "cancelado") {
      updates.cancelado_at = new Date().toISOString();
    }

    const serviceClient = await createServiceRoleClient();
    const { error } = await serviceClient
      .from("pedidos")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("[Admin PATCH] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send transactional emails on state changes
    if (updates.estado === "pago_confirmado" || updates.estado === "enviado" || updates.estado === "cancelado") {
      const { data: pedido } = await serviceClient
        .from("pedidos")
        .select("*")
        .eq("id", id)
        .single();

      if (pedido) {
        const p = pedido as Pedido;
        if (updates.estado === "pago_confirmado") {
          const email = pagoRecibidoEmail(p);
          await sendEmail({ to: p.email, ...email });
        } else if (updates.estado === "enviado") {
          const email = pedidoEnviadoEmail(p);
          await sendEmail({ to: p.email, ...email });
        } else if (updates.estado === "cancelado") {
          const motivo = body.motivo_cancelacion || undefined;
          const email = pedidoCanceladoEmail(p, motivo);
          await sendEmail({ to: p.email, ...email });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[Admin PATCH] Unexpected error:", (err as Error).message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const serviceClient = await createServiceRoleClient();

  // Only allow deleting cancelled orders
  const { data: pedido } = await serviceClient
    .from("pedidos")
    .select("estado")
    .eq("id", id)
    .single();

  if (!pedido) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  if (pedido.estado !== "cancelado") {
    return NextResponse.json(
      { error: "Solo se pueden eliminar pedidos cancelados" },
      { status: 400 }
    );
  }

  // Delete items first, then pedido
  await serviceClient.from("pedido_items").delete().eq("pedido_id", id);
  const { error } = await serviceClient.from("pedidos").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
