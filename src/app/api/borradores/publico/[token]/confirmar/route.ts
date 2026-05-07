import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email/send";
import { pedidoConfirmadoEmail, nuevoPedidoAdminEmail } from "@/lib/email/templates";
import { rateLimitByIp } from "@/lib/rate-limit";
import {
  calculateSubtotal,
  calculateDescuento,
  calculateBorradorPackage,
  calculateSena,
} from "@/lib/borrador";
import { cotizar } from "@/lib/correo-argentino";
import type {
  EstadoPedido,
  MetodoEnvio,
  MetodoPago,
  Pedido,
  PedidoBorrador,
  TipoEnvio,
  DireccionEnvio,
} from "@/types";

interface ConfirmarBody {
  // Datos del cliente
  datos_personales: {
    nombre_completo: string;
    dni?: string;
    email: string;
    telefono: string;
  };
  // Envío
  metodo_envio: MetodoEnvio;
  tipo_envio?: TipoEnvio | null;
  direccion_envio?: DireccionEnvio | null;
  sucursal_correo_id?: string | null;
  sucursal_correo_nombre?: string | null;
  // Pago
  metodo_pago: MetodoPago;
  // Anti-abuso
  captchaToken?: string;
}

const RECARGO_MP_PCT = 13;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    // 0. Rate limit (más estricto que checkout normal por ser público con token)
    const { ok } = rateLimitByIp(req, "borrador-confirmar", {
      limit: 3,
      windowMs: 60_000,
    });
    if (!ok) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intentá en un minuto." },
        { status: 429 }
      );
    }

    const { token } = await params;
    if (!token || !/^[a-f0-9]{32}$/.test(token)) {
      return NextResponse.json({ error: "Link inválido" }, { status: 400 });
    }

    const body = (await req.json()) as ConfirmarBody;

    // 1. Validar Turnstile (mismo flujo que /api/pedidos)
    if (process.env.TURNSTILE_SECRET_KEY) {
      if (!body.captchaToken) {
        return NextResponse.json(
          { error: "Completá la verificación de seguridad" },
          { status: 400 }
        );
      }
      const verifyRes = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            secret: process.env.TURNSTILE_SECRET_KEY,
            response: body.captchaToken,
          }),
        }
      );
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return NextResponse.json(
          { error: "Verificación de seguridad fallida. Recargá e intentá de nuevo." },
          { status: 403 }
        );
      }
    }

    // 2. Validaciones básicas
    if (!body.datos_personales?.nombre_completo || !body.datos_personales?.email) {
      return NextResponse.json(
        { error: "Faltan datos personales" },
        { status: 400 }
      );
    }
    if (!body.metodo_envio || !body.metodo_pago) {
      return NextResponse.json(
        { error: "Faltan método de envío y/o pago" },
        { status: 400 }
      );
    }
    if (body.metodo_envio !== "retiro" && !body.direccion_envio?.codigo_postal) {
      return NextResponse.json(
        { error: "Faltan datos de envío" },
        { status: 400 }
      );
    }

    const service = await createServiceRoleClient();

    // 3. Cargar borrador y validar
    const { data: borradorRow } = await service
      .from("pedidos_borrador")
      .select("*")
      .eq("token", token)
      .single();
    if (!borradorRow) {
      return NextResponse.json({ error: "Link no encontrado" }, { status: 404 });
    }
    const borrador = borradorRow as PedidoBorrador;

    if (borrador.estado !== "pendiente") {
      return NextResponse.json(
        { error: `Este link no está disponible (${borrador.estado})` },
        { status: 400 }
      );
    }
    if (new Date(borrador.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Este link expiró" },
        { status: 400 }
      );
    }

    // 4. Validar método de pago contra los permitidos
    if (
      borrador.metodos_pago_permitidos &&
      !borrador.metodos_pago_permitidos.includes(body.metodo_pago)
    ) {
      return NextResponse.json(
        {
          error: `Método de pago no permitido. Permitidos: ${borrador.metodos_pago_permitidos.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // 4b. Si el borrador tiene seña, no se puede pagar en efectivo (la seña
    //     es un anticipo digital — efectivo es "pago todo al retirar", incompatible).
    const tieneSena = borrador.sena_tipo !== null && borrador.sena_valor !== null;
    if (tieneSena && body.metodo_pago === "efectivo") {
      return NextResponse.json(
        {
          error: "Los pedidos con seña no se pueden pagar en efectivo. Elegí MercadoPago o transferencia.",
        },
        { status: 400 }
      );
    }

    // 5. Calcular subtotal y descuento
    const subtotal = calculateSubtotal(borrador.items);
    const descuento = calculateDescuento(
      subtotal,
      Number(borrador.descuento_monto),
      Number(borrador.descuento_porcentaje)
    );

    // 6. Calcular costo de envío
    let costoEnvio = 0;
    if (body.metodo_envio === "retiro") {
      costoEnvio = 0;
    } else if (borrador.envio_gratis) {
      costoEnvio = 0;
    } else if (borrador.costo_envio_override !== null) {
      costoEnvio = Number(borrador.costo_envio_override);
    } else {
      // Cotizar con Correo Argentino
      const cp = body.direccion_envio?.codigo_postal;
      if (!cp || !/^\d{4}$/.test(cp)) {
        return NextResponse.json(
          { error: "Código postal inválido" },
          { status: 400 }
        );
      }
      const pkg = calculateBorradorPackage(borrador);
      try {
        const cot = await cotizar(cp, pkg);
        const rate =
          body.tipo_envio === "sucursal" ? cot.sucursal : cot.domicilio;
        if (!rate) {
          return NextResponse.json(
            { error: "No pudimos cotizar el envío para ese CP" },
            { status: 400 }
          );
        }
        costoEnvio = rate.price;
      } catch {
        return NextResponse.json(
          { error: "Error al cotizar el envío. Probá de nuevo." },
          { status: 500 }
        );
      }
    }

    // 7. Calcular total con recargo MP si corresponde.
    // Si hay seña, no se aplica recargo MP (el anticipo se cobra pelado).
    const baseTotal = subtotal - descuento + costoEnvio;
    const recargoMP =
      body.metodo_pago === "mercadopago" && !tieneSena
        ? Math.round((baseTotal * RECARGO_MP_PCT) / 100)
        : 0;
    const total = baseTotal + recargoMP;

    // 7b. Calcular monto de seña sobre subtotal - descuento (NO incluye envío
    //     ni recargo MP). El saldo absorbe el costo de envío.
    const montoSena = tieneSena
      ? calculateSena(
          subtotal - descuento,
          borrador.sena_tipo,
          Number(borrador.sena_valor)
        )
      : null;

    // 8. Estado inicial — efectivo arranca en pago_confirmado
    const estadoInicial: EstadoPedido =
      body.metodo_pago === "efectivo" ? "pago_confirmado" : "pendiente_pago";

    // 9. Generar número de pedido (mismo contador que checkout normal)
    const { data: counterRow } = await service
      .from("configuracion")
      .select("value")
      .eq("key", "pedido_counter")
      .single();
    const nextNum = counterRow ? parseInt(counterRow.value, 10) + 1 : 1;
    await service
      .from("configuracion")
      .upsert({ key: "pedido_counter", value: String(nextNum) }, { onConflict: "key" });
    const numeroPedido = `SS-${String(nextNum).padStart(5, "0")}`;

    // 10. Descripción del descuento
    let descuentoDescripcion: string | null = null;
    if (descuento > 0) {
      if (Number(borrador.descuento_porcentaje) > 0) {
        descuentoDescripcion = `Descuento ${borrador.descuento_porcentaje}%`;
      } else {
        descuentoDescripcion = `Descuento aplicado`;
      }
    }

    // 11. Crear pedido
    const { data: pedidoRow, error: pedidoErr } = await service
      .from("pedidos")
      .insert({
        numero_pedido: numeroPedido,
        estado: estadoInicial,
        nombre_cliente: body.datos_personales.nombre_completo,
        dni: body.datos_personales.dni || "",
        email: body.datos_personales.email,
        telefono: body.datos_personales.telefono,
        direccion_envio: body.direccion_envio || null,
        metodo_envio: body.metodo_envio,
        tipo_envio: body.tipo_envio || null,
        costo_envio: costoEnvio,
        metodo_pago: body.metodo_pago,
        recargo_mp: recargoMP,
        subtotal,
        total,
        sucursal_correo_id: body.sucursal_correo_id || null,
        sucursal_correo_nombre: body.sucursal_correo_nombre || null,
        // Custom orders
        borrador_id: borrador.id,
        descuento_monto: descuento,
        descuento_descripcion: descuentoDescripcion,
        // Override de paquete (copia del borrador, lo lee importar-envio)
        paquete_peso_gr: borrador.paquete_peso_gr,
        paquete_alto_cm: borrador.paquete_alto_cm,
        paquete_ancho_cm: borrador.paquete_ancho_cm,
        paquete_largo_cm: borrador.paquete_largo_cm,
        // Seña
        tiene_sena: tieneSena,
        monto_sena: montoSena,
      })
      .select("id, numero_pedido")
      .single();

    if (pedidoErr || !pedidoRow) {
      console.error("[borrador confirmar] error crear pedido:", pedidoErr);
      return NextResponse.json(
        { error: "Error al crear el pedido" },
        { status: 500 }
      );
    }

    // 12. Crear pedido_items
    const pedidoItems = borrador.items.map((it) => ({
      pedido_id: pedidoRow.id,
      producto_id: it.producto_id, // nullable — items custom van con null
      nombre_producto: it.nombre,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
      opciones_seleccionadas: it.opciones_seleccionadas || [],
      subtotal: it.precio_unitario * it.cantidad,
    }));

    const { error: itemsErr } = await service.from("pedido_items").insert(pedidoItems);
    if (itemsErr) {
      console.error("[borrador confirmar] error crear items:", itemsErr);
      // Rollback del pedido
      await service.from("pedidos").delete().eq("id", pedidoRow.id);
      return NextResponse.json(
        { error: "Error al crear los items del pedido" },
        { status: 500 }
      );
    }

    // 13. Marcar borrador como convertido. Race-safe: si pierde el race
    //     (otro request ya lo convirtió), borrar el pedido recién creado.
    const { data: updRows, error: updErr } = await service
      .from("pedidos_borrador")
      .update({ estado: "convertido", pedido_id: pedidoRow.id })
      .eq("id", borrador.id)
      .eq("estado", "pendiente")
      .select("id");

    if (updErr || !updRows || updRows.length === 0) {
      console.error("[borrador confirmar] race/update lost:", updErr);
      // Rollback
      await service.from("pedido_items").delete().eq("pedido_id", pedidoRow.id);
      await service.from("pedidos").delete().eq("id", pedidoRow.id);
      return NextResponse.json(
        { error: "Este link ya fue usado por otra persona" },
        { status: 409 }
      );
    }

    // 14. Enviar emails (no bloqueante para errores)
    try {
      const fullPedido = {
        id: pedidoRow.id,
        numero_pedido: pedidoRow.numero_pedido,
        estado: estadoInicial,
        nombre_cliente: body.datos_personales.nombre_completo,
        dni: body.datos_personales.dni || "",
        email: body.datos_personales.email,
        telefono: body.datos_personales.telefono,
        direccion_envio: body.direccion_envio || null,
        metodo_envio: body.metodo_envio,
        tipo_envio: body.tipo_envio || null,
        costo_envio: costoEnvio,
        metodo_pago: body.metodo_pago,
        recargo_mp: recargoMP,
        subtotal,
        total,
        mp_preference_id: null,
        mp_payment_id: null,
        tracking_code: null,
        tracking_url: null,
        sucursal_correo_id: body.sucursal_correo_id || null,
        sucursal_correo_nombre: body.sucursal_correo_nombre || null,
        correo_shipping_id: null,
        correo_imported_at: null,
        correo_import_response: null,
        enviado_inventario: false,
        inventario_pedido_id: null,
        inventario_enviado_en: null,
        borrador_id: borrador.id,
        descuento_monto: descuento,
        descuento_descripcion: descuentoDescripcion,
        paquete_peso_gr: borrador.paquete_peso_gr,
        paquete_alto_cm: borrador.paquete_alto_cm,
        paquete_ancho_cm: borrador.paquete_ancho_cm,
        paquete_largo_cm: borrador.paquete_largo_cm,
        tiene_sena: tieneSena,
        monto_sena: montoSena,
        sena_pagada: false,
        sena_pagada_at: null,
        saldo_pagado: false,
        saldo_pagado_at: null,
        notas: null,
        cancelado_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: pedidoItems.map((pi, i) => ({
          ...pi,
          id: `temp-${i}`,
          opciones_seleccionadas: borrador.items[i].opciones_seleccionadas || [],
        })),
      } as Pedido & { items: typeof pedidoItems extends Array<infer T> ? (T & { id: string })[] : never };

      // Datos bancarios para transferencia
      let datosBancarios: { cbu?: string; alias?: string } | undefined;
      if (body.metodo_pago === "transferencia") {
        const { data: config } = await service
          .from("configuracion")
          .select("key, value")
          .in("key", ["cbu", "alias"]);
        if (config?.length) {
          datosBancarios = {};
          config.forEach((c: { key: string; value: string }) => {
            if (c.key === "cbu") datosBancarios!.cbu = c.value;
            if (c.key === "alias") datosBancarios!.alias = c.value;
          });
        }
      }

      const clientEmail = pedidoConfirmadoEmail(fullPedido, datosBancarios);
      await sendEmail({ to: body.datos_personales.email, ...clientEmail });

      if (process.env.SMTP_USER) {
        const adminEmail = nuevoPedidoAdminEmail(fullPedido);
        await sendEmail({ to: process.env.SMTP_USER, ...adminEmail });
      }
    } catch (mailErr) {
      console.error("[borrador confirmar] error mandando emails:", mailErr);
      // No interrumpimos — el pedido ya está creado correctamente
    }

    return NextResponse.json({
      id: pedidoRow.id,
      numero_pedido: pedidoRow.numero_pedido,
    });
  } catch (err) {
    console.error("[borrador confirmar] Unexpected:", (err as Error).message);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
