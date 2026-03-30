import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createServiceRoleClient } from "@/lib/supabase-server";

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
});

export async function POST(req: NextRequest) {
  try {
    const { pedido_id } = await req.json();

    if (!pedido_id) {
      return NextResponse.json({ error: "pedido_id requerido" }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Fetch order with items
    const { data: pedido, error } = await supabase
      .from("pedidos")
      .select("*, items:pedido_items(*)")
      .eq("id", pedido_id)
      .single();

    if (error || !pedido) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    if (pedido.metodo_pago !== "mercadopago") {
      return NextResponse.json({ error: "El pedido no es de MercadoPago" }, { status: 400 });
    }

    if (pedido.estado !== "pendiente_pago") {
      return NextResponse.json({ error: "El pedido ya fue pagado o cancelado" }, { status: 400 });
    }

    // Build MP preference items
    const items: { id: string; title: string; quantity: number; unit_price: number; currency_id: string }[] = pedido.items.map((item: {
      nombre_producto: string;
      cantidad: number;
      precio_unitario: number;
    }) => ({
      id: pedido_id,
      title: item.nombre_producto.slice(0, 256),
      quantity: Number(item.cantidad),
      unit_price: Number(item.precio_unitario),
      currency_id: "ARS",
    }));

    // Add shipping as item if > 0
    if (Number(pedido.costo_envio) > 0) {
      items.push({
        id: "envio",
        title: "Costo de envío",
        quantity: 1,
        unit_price: Number(pedido.costo_envio),
        currency_id: "ARS",
      });
    }

    // Add MP surcharge as item if > 0
    if (Number(pedido.recargo_mp) > 0) {
      items.push({
        id: "recargo-mp",
        title: "Recargo MercadoPago",
        quantity: 1,
        unit_price: Number(pedido.recargo_mp),
        currency_id: "ARS",
      });
    }

    const siteUrl = "https://sendero3d.com";

    const backUrls = {
      success: `${siteUrl}/pedido/${pedido_id}?pago=aprobado`,
      failure: `${siteUrl}/pedido/${pedido_id}?pago=rechazado`,
      pending: `${siteUrl}/pedido/${pedido_id}?pago=pendiente`,
    };

    console.log("MP preference backUrls:", JSON.stringify(backUrls));
    console.log("MP preference items:", JSON.stringify(items));

    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items,
        back_urls: backUrls,
        auto_return: "approved",
        external_reference: pedido_id,
        notification_url: `${siteUrl}/api/mercadopago/webhook`,
        payer: {
          name: pedido.nombre_cliente,
          email: pedido.email,
        },
      },
    });

    // Save preference ID
    await supabase
      .from("pedidos")
      .update({ mp_preference_id: result.id })
      .eq("id", pedido_id);

    return NextResponse.json({
      init_point: result.init_point,
      preference_id: result.id,
    });
  } catch (err: unknown) {
    const errObj = err as Record<string, unknown>;
    const message = errObj?.message || errObj?.cause || JSON.stringify(err);
    console.error("MP create-preference error:", JSON.stringify(err, null, 2));
    return NextResponse.json({ error: `Error MP: ${message}` }, { status: 500 });
  }
}
