import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email/send";
import { pedidoConfirmadoEmail, nuevoPedidoAdminEmail } from "@/lib/email/templates";
import { rateLimitByIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const { ok } = rateLimitByIp(req, "pedidos", { limit: 5, windowMs: 60_000 });
    if (!ok) {
      return NextResponse.json({ error: "Demasiadas solicitudes. Intentá en un minuto." }, { status: 429 });
    }

    const body = await req.json();
    const {
      datos_personales,
      metodo_envio,
      tipo_envio,
      direccion_envio,
      metodo_pago,
      items,
      costoEnvio,
      recargoMP,
      subtotal,
      total,
      captchaToken,
    } = body;

    // Verificar Turnstile CAPTCHA si está configurado
    if (process.env.TURNSTILE_SECRET_KEY) {
      if (!captchaToken) {
        return NextResponse.json({ error: "Completá la verificación de seguridad" }, { status: 400 });
      }

      const verifyRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: captchaToken,
        }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return NextResponse.json({ error: "Verificación de seguridad fallida. Recargá e intentá de nuevo." }, { status: 403 });
      }
    }

    // Validaciones básicas
    if (!datos_personales?.nombre_completo || !datos_personales?.email) {
      return NextResponse.json({ error: "Datos personales incompletos" }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Generar número de pedido usando contador persistente en configuracion
    // Esto garantiza que los números nunca se repiten aunque se eliminen pedidos
    const { data: counterRow } = await supabase
      .from("configuracion")
      .select("value")
      .eq("key", "pedido_counter")
      .single();

    const nextNum = counterRow ? parseInt(counterRow.value, 10) + 1 : 1;

    // Upsert the counter
    await supabase
      .from("configuracion")
      .upsert({ key: "pedido_counter", value: String(nextNum) }, { onConflict: "key" });

    const numeroPedido = `SS-${String(nextNum).padStart(5, "0")}`;

    // Crear pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .insert({
        numero_pedido: numeroPedido,
        estado: "pendiente_pago",
        nombre_cliente: datos_personales.nombre_completo,
        dni: datos_personales.dni,
        email: datos_personales.email,
        telefono: datos_personales.telefono,
        direccion_envio: direccion_envio,
        metodo_envio: metodo_envio,
        tipo_envio: tipo_envio || null,
        costo_envio: costoEnvio,
        metodo_pago: metodo_pago,
        recargo_mp: recargoMP,
        subtotal: subtotal,
        total: total,
      })
      .select("id, numero_pedido")
      .single();

    if (pedidoError) {
      console.error("Error creating pedido:", pedidoError);
      return NextResponse.json({ error: "Error al crear el pedido" }, { status: 500 });
    }

    // Crear items del pedido
    const pedidoItems = items.map((item: {
      producto_id: string;
      nombre: string;
      cantidad: number;
      precio_unitario: number;
      opciones: Array<{ grupo_id: string; grupo_nombre: string; opcion_id: string; opcion_valor: string; precio_adicional: number }>;
      subtotal: number;
    }) => ({
      pedido_id: pedido.id,
      producto_id: item.producto_id,
      nombre_producto: item.nombre,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      opciones_seleccionadas: item.opciones,
      subtotal: item.subtotal,
    }));

    const { error: itemsError } = await supabase
      .from("pedido_items")
      .insert(pedidoItems);

    if (itemsError) {
      console.error("Error creating pedido items:", itemsError);
      // Rollback: delete the pedido
      await supabase.from("pedidos").delete().eq("id", pedido.id);
      return NextResponse.json({ error: "Error al crear los items del pedido" }, { status: 500 });
    }

    // Send emails (non-blocking)
    const fullPedido = {
      ...body,
      id: pedido.id,
      numero_pedido: pedido.numero_pedido,
      estado: "pendiente_pago" as const,
      nombre_cliente: datos_personales.nombre_completo,
      dni: datos_personales.dni,
      email: datos_personales.email,
      telefono: datos_personales.telefono,
      direccion_envio,
      metodo_envio,
      tipo_envio: tipo_envio || null,
      costo_envio: costoEnvio,
      metodo_pago,
      recargo_mp: recargoMP,
      subtotal,
      total,
      mp_preference_id: null,
      mp_payment_id: null,
      tracking_code: null,
      tracking_url: null,
      notas: null,
      cancelado_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: pedidoItems.map((pi: Record<string, unknown>, i: number) => ({
        ...pi,
        id: `temp-${i}`,
        opciones_seleccionadas: items[i].opciones,
      })),
    };

    // Fetch bank details for transfer orders
    let datosBancarios: { cbu?: string; alias?: string } | undefined;
    if (metodo_pago === "transferencia") {
      const { data: config } = await supabase.from("configuracion").select("key, value").in("key", ["cbu", "alias"]);
      if (config?.length) {
        datosBancarios = {};
        config.forEach((c: { key: string; value: string }) => {
          if (c.key === "cbu") datosBancarios!.cbu = c.value;
          if (c.key === "alias") datosBancarios!.alias = c.value;
        });
      }
    }

    // Email al cliente
    const clientEmail = pedidoConfirmadoEmail(fullPedido, datosBancarios);
    await sendEmail({ to: datos_personales.email, ...clientEmail });

    // Email al admin
    if (process.env.SMTP_USER) {
      const adminEmail = nuevoPedidoAdminEmail(fullPedido);
      await sendEmail({ to: process.env.SMTP_USER, ...adminEmail });
    }

    return NextResponse.json({
      id: pedido.id,
      numero_pedido: pedido.numero_pedido,
    });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
