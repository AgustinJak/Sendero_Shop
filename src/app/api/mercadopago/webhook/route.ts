import { NextRequest, NextResponse, after } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email/send";
import { pagoRecibidoEmail, pagoConfirmadoAdminEmail } from "@/lib/email/templates";
import { getWhatsapp } from "@/lib/site-config";
import { escaparHtml } from "@/lib/email/seguridad";
import { enviarCompraAMeta } from "@/lib/meta-capi";

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
        // El pago se consulta a MP con nuestro token, así que no se puede
        // inventar. Lo que se controla acá es que sea por lo que vale el
        // pedido: el total, o la seña si el pedido lleva seña. Si no coincide,
        // no se confirma solo y se avisa para revisarlo a mano
        // (SHOP - Seguridad, punto 11). Pagar de más no es un riesgo: se acepta.
        const esperado = pedido.tiene_sena ? Number(pedido.monto_sena) : Number(pedido.total);
        const cobrado = Number(payment.transaction_amount);
        if (payment.currency_id !== "ARS" || !(cobrado >= esperado - 1)) {
          console.error(
            `Webhook: pago ${paymentId} de ${payment.currency_id} ${cobrado} para ${pedido.numero_pedido}, que espera ARS ${esperado}. No se confirma.`
          );
          await supabase
            .from("pedidos")
            .update({ mp_payment_id: String(paymentId) })
            .eq("id", pedidoId);
          if (process.env.SMTP_USER) {
            await sendEmail({
              to: process.env.SMTP_USER,
              subject: `Revisar pago de ${pedido.numero_pedido}: el monto no coincide`,
              html: `<p>Mercado Pago aprobó el pago ${escaparHtml(String(paymentId))} por ${escaparHtml(String(payment.currency_id))} ${escaparHtml(String(cobrado))} para el pedido ${escaparHtml(pedido.numero_pedido)}, que espera ARS ${escaparHtml(String(esperado))}.</p><p>El pedido sigue en "pendiente de pago". Revisalo en Mercado Pago y confirmalo a mano desde el panel si corresponde.</p>`,
            });
          }
          return NextResponse.json({ ok: true });
        }

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

        // MP suele mandar dos avisos casi juntos por el mismo pago. El UPDATE
        // solo toca el pedido si sigue pendiente: el segundo aviso no cambia
        // nada y no manda los emails otra vez.
        const { data: confirmados } = await supabase
          .from("pedidos")
          .update(updates)
          .eq("id", pedidoId)
          .eq("estado", "pendiente_pago")
          .select("id");
        if (!confirmados?.length) {
          return NextResponse.json({ ok: true });
        }

        // La compra para Meta Ads, después de responder (lib/meta-capi.ts).
        after(() => enviarCompraAMeta(pedidoId));

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
