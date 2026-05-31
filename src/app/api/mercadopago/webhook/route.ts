import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email/send";
import { pagoRecibidoEmail, pagoConfirmadoAdminEmail } from "@/lib/email/templates";
import { getWhatsapp } from "@/lib/site-config";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MP sends different notification types, we only care about payments
    if (body.type !== "payment" && body.action !== "payment.updated") {
      return NextResponse.json({ ok: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return NextResponse.json({ ok: true });
    }

    // Fetch payment details from MP
    const paymentClient = new Payment(client);
    const payment = await paymentClient.get({ id: paymentId });

    if (!payment.external_reference) {
      return NextResponse.json({ ok: true });
    }

    const pedidoId = payment.external_reference;
    const supabase = await createServiceRoleClient();

    // Fetch current order
    const { data: pedido } = await supabase
      .from("pedidos")
      .select("*")
      .eq("id", pedidoId)
      .single();

    if (!pedido) {
      console.error("Webhook: pedido not found:", pedidoId);
      return NextResponse.json({ ok: true });
    }

    // Map MP status to our order status
    if (payment.status === "approved") {
      // Only update if still pending payment
      if (pedido.estado === "pendiente_pago") {
        const updates: Record<string, unknown> = {
          estado: "pago_confirmado",
          mp_payment_id: String(paymentId),
        };
        // Si el pedido tiene seña, MP cobró la seña — marcamos sena_pagada.
        // El saldo se cobra offline después.
        if (pedido.tiene_sena) {
          updates.sena_pagada = true;
          updates.sena_pagada_at = new Date().toISOString();
        }

        await supabase
          .from("pedidos")
          .update(updates)
          .eq("id", pedidoId);

        // Send confirmation email
        try {
          const { data: items } = await supabase
            .from("pedido_items")
            .select("*")
            .eq("pedido_id", pedidoId);

          const fullPedido = {
            ...pedido,
            estado: "pago_confirmado" as const,
            mp_payment_id: String(paymentId),
            sena_pagada: pedido.tiene_sena ? true : pedido.sena_pagada,
            sena_pagada_at: pedido.tiene_sena
              ? new Date().toISOString()
              : pedido.sena_pagada_at,
            items: items || [],
          };

          // Email al cliente
          const whatsapp = await getWhatsapp();
          const emailData = pagoRecibidoEmail(fullPedido, whatsapp);
          await sendEmail({ to: pedido.email, ...emailData });

          // Email al admin
          if (process.env.SMTP_USER) {
            const adminEmailData = pagoConfirmadoAdminEmail(fullPedido);
            await sendEmail({ to: process.env.SMTP_USER, ...adminEmailData });
          }
        } catch (emailErr) {
          console.error("Webhook email error:", emailErr);
        }
      }
    } else if (payment.status === "rejected" || payment.status === "cancelled") {
      await supabase
        .from("pedidos")
        .update({ mp_payment_id: String(paymentId) })
        .eq("id", pedidoId);
    }
    // For "pending" or "in_process", we just store the payment ID
    else if (payment.status === "pending" || payment.status === "in_process") {
      await supabase
        .from("pedidos")
        .update({ mp_payment_id: String(paymentId) })
        .eq("id", pedidoId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("MP webhook error:", err);
    // Always return 200 to avoid MP retries
    return NextResponse.json({ ok: true });
  }
}
