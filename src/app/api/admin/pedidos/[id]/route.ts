import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email/send";
import { pagoRecibidoEmail, pedidoEnviadoEmail } from "@/lib/email/templates";
import type { Pedido } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send transactional emails on state changes
  if (updates.estado === "pago_confirmado" || updates.estado === "enviado") {
    const { data: pedido } = await serviceClient
      .from("pedidos")
      .select("*")
      .eq("id", id)
      .single();

    if (pedido) {
      const p = pedido as Pedido;
      if (updates.estado === "pago_confirmado") {
        const email = pagoRecibidoEmail(p);
        sendEmail({ to: p.email, ...email });
      } else if (updates.estado === "enviado") {
        const email = pedidoEnviadoEmail(p);
        sendEmail({ to: p.email, ...email });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
