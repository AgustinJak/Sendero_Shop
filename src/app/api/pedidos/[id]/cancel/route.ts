import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email/send";
import { pedidoCanceladoEmail } from "@/lib/email/templates";
import type { Pedido } from "@/types";

const CANCELLABLE_STATES = ["pendiente_pago", "pago_confirmado"];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServiceRoleClient();

  // Fetch the order
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("*")
    .eq("id", id)
    .single();

  if (!pedido) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  const p = pedido as Pedido;

  if (!CANCELLABLE_STATES.includes(p.estado)) {
    return NextResponse.json(
      { error: "Este pedido no se puede cancelar en su estado actual" },
      { status: 400 }
    );
  }

  // Update to cancelled
  const { error } = await supabase
    .from("pedidos")
    .update({
      estado: "cancelado",
      cancelado_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Send cancellation email to customer
  const email = pedidoCanceladoEmail(p, "Cancelado por el cliente");
  await sendEmail({ to: p.email, ...email });

  // Notify admin
  if (process.env.SMTP_USER) {
    await sendEmail({
      to: process.env.SMTP_USER,
      subject: `Pedido ${p.numero_pedido} cancelado por el cliente`,
      html: email.html,
    });
  }

  return NextResponse.json({ ok: true });
}
