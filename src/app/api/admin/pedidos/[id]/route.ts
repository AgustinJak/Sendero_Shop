import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email/send";
import { pagoRecibidoEmail, pedidoEnviadoEmail, pedidoListoRetiroEmail, pedidoEntregadoEmail, pedidoCanceladoEmail } from "@/lib/email/templates";
import { getWhatsapp } from "@/lib/site-config";
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
    const allowedFields = [
      "estado",
      "tracking_code",
      "tracking_url",
      "notas",
      "sena_pagada",
      "saldo_pagado",
      "entre_calles",
    ];
    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (updates.estado === "cancelado") {
      updates.cancelado_at = new Date().toISOString();
    }

    // Timestamps automáticos cuando se marca seña/saldo como pagado.
    // Si se desmarca (toggle a false), los limpiamos.
    if ("sena_pagada" in updates) {
      updates.sena_pagada_at = updates.sena_pagada ? new Date().toISOString() : null;
    }
    if ("saldo_pagado" in updates) {
      updates.saldo_pagado_at = updates.saldo_pagado ? new Date().toISOString() : null;
    }

    const serviceClient = await createServiceRoleClient();

    // Confirmar la seña a mano confirma el pedido.
    //
    // Cuando la seña entra por MercadoPago, el webhook ya deja el pedido en
    // `pago_confirmado`. Si llega por transferencia la marca el admin desde
    // acá, y sin esto el pedido se quedaba en `pendiente_pago` con la seña
    // cobrada — visible para el cliente y, peor, elegible para que el cron lo
    // cancele a las 48 h. Ver lib/sena.ts.
    if (updates.sena_pagada === true && !("estado" in updates)) {
      const { data: actual } = await serviceClient
        .from("pedidos")
        .select("estado")
        .eq("id", id)
        .single();

      if (actual?.estado === "pendiente_pago") {
        updates.estado = "pago_confirmado";
      }
    }
    const { error } = await serviceClient
      .from("pedidos")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("[Admin PATCH] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send transactional emails on state changes
    const emailStates = ["pago_confirmado", "enviado", "esperando_retiro", "entregado", "cancelado"];
    if (emailStates.includes(updates.estado as string)) {
      const { data: pedido } = await serviceClient
        .from("pedidos")
        .select("*")
        .eq("id", id)
        .single();

      if (pedido) {
        const p = pedido as Pedido;
        const whatsapp = await getWhatsapp();
        if (updates.estado === "pago_confirmado") {
          // Para efectivo no mandamos el email "Recibimos tu pago" porque el
          // pago se cobra al retirar — todavía no se recibió. Los pedidos en
          // efectivo nacen ya en pago_confirmado y reciben el email de
          // confirmación inicial; este trigger solo aplica si admin rebobinea
          // el estado.
          if (p.metodo_pago !== "efectivo") {
            const email = pagoRecibidoEmail(p, whatsapp);
            await sendEmail({ to: p.email, ...email });
          }
        } else if (updates.estado === "enviado") {
          const email = pedidoEnviadoEmail(p, whatsapp);
          await sendEmail({ to: p.email, ...email });
        } else if (updates.estado === "esperando_retiro") {
          const email = pedidoListoRetiroEmail(p, whatsapp);
          await sendEmail({ to: p.email, ...email });
        } else if (updates.estado === "entregado") {
          const email = pedidoEntregadoEmail(p, whatsapp);
          await sendEmail({ to: p.email, ...email });
        } else if (updates.estado === "cancelado") {
          const motivo = body.motivo_cancelacion || undefined;
          const email = pedidoCanceladoEmail(p, whatsapp, motivo);
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
