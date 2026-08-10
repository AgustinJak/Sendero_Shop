import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email/send";
import { pedidoConfirmadoEmail, nuevoPedidoAdminEmail } from "@/lib/email/templates";
import { getWhatsapp, getSiteConfig } from "@/lib/site-config";
import { rateLimitByIp } from "@/lib/rate-limit";
import { resolverPrecios } from "@/lib/precios-server";

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
      captchaToken,
      sucursal_correo_id,
      sucursal_correo_nombre,
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

    // Precios autoritativos: se recalculan contra la base, ignorando los que
    // vinieron en el body. El cliente solo aporta ids y cantidades.
    // Va antes de reservar el número para que un pedido inválido no lo consuma.
    let preciados;
    try {
      preciados = await resolverPrecios(items);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al validar el pedido";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const subtotal = preciados.subtotal;

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

    // Config autoritativa desde el server (no confiar en el cliente).
    const { recargo_mp_porcentaje: recargoPct, envio_gratis_desde: envioGratisDesde } =
      await getSiteConfig();

    // El costo de envío es una cotización viva de Correo Argentino, así que se
    // toma del cliente; se acota a un valor sano para que no reste del total.
    const envioCliente = Number(costoEnvio);
    const costoEnvioBase =
      Number.isFinite(envioCliente) && envioCliente > 0
        ? Math.min(envioCliente, 1_000_000)
        : 0;

    // Envío gratis: si el subtotal alcanza el umbral, el envío pasa a 0.
    const aplicaEnvioGratis =
      envioGratisDesde > 0 && subtotal >= envioGratisDesde;
    const costoEnvioFinal =
      metodo_envio === "retiro" || aplicaEnvioGratis ? 0 : costoEnvioBase;

    const recargoMP =
      metodo_pago === "mercadopago"
        ? Math.round((subtotal + costoEnvioFinal) * recargoPct / 100)
        : 0;
    const total = subtotal + costoEnvioFinal + recargoMP;

    // En efectivo no hay pago online que esperar — el dinero se cobra al
    // retiro/entrega. El pedido nace directamente "confirmado" (estado
    // pago_confirmado, que la UI muestra como "Pedido confirmado" para
    // efectivo).
    const estadoInicial: "pendiente_pago" | "pago_confirmado" =
      metodo_pago === "efectivo" ? "pago_confirmado" : "pendiente_pago";

    // Crear pedido
    const { data: pedido, error: pedidoError } = await supabase
      .from("pedidos")
      .insert({
        numero_pedido: numeroPedido,
        estado: estadoInicial,
        nombre_cliente: datos_personales.nombre_completo,
        dni: datos_personales.dni,
        email: datos_personales.email,
        telefono: datos_personales.telefono,
        direccion_envio: direccion_envio,
        metodo_envio: metodo_envio,
        tipo_envio: tipo_envio || null,
        costo_envio: costoEnvioFinal,
        metodo_pago: metodo_pago,
        recargo_mp: recargoMP,
        subtotal: subtotal,
        total: total,
        sucursal_correo_id: sucursal_correo_id || null,
        sucursal_correo_nombre: sucursal_correo_nombre || null,
      })
      .select("id, numero_pedido")
      .single();

    if (pedidoError) {
      console.error("Error creating pedido:", pedidoError);
      return NextResponse.json({ error: "Error al crear el pedido" }, { status: 500 });
    }

    // Crear items del pedido — con los precios ya resueltos por el servidor.
    // `producto_id` es el vínculo real al catálogo (null en kits y en ítems
    // mayoristas sin producto asociado).
    const pedidoItems = preciados.items.map((item) => ({
      pedido_id: pedido.id,
      producto_id: item.producto_id,
      nombre_producto: item.nombre_producto,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      opciones_seleccionadas: item.opciones_seleccionadas,
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
      estado: estadoInicial,
      nombre_cliente: datos_personales.nombre_completo,
      dni: datos_personales.dni,
      email: datos_personales.email,
      telefono: datos_personales.telefono,
      direccion_envio,
      metodo_envio,
      tipo_envio: tipo_envio || null,
      costo_envio: costoEnvioFinal,
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
      items: pedidoItems.map((pi, i: number) => ({
        ...pi,
        id: `temp-${i}`,
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
    const whatsapp = await getWhatsapp();
    const clientEmail = pedidoConfirmadoEmail(fullPedido, whatsapp, datosBancarios);
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
