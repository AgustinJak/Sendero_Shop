import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email/send";
import { pedidoConfirmadoEmail, nuevoPedidoAdminEmail } from "@/lib/email/templates";
import { getWhatsapp, getSiteConfig } from "@/lib/site-config";
import { dentroDelLimite, huella, ipDe } from "@/lib/limite";
import { esEmailValido } from "@/lib/email/seguridad";
import { costoEnvioCorreo } from "@/lib/envio-servidor";
import { resolverPrecios } from "@/lib/precios-server";
import { requiereSena, calcularSenaEfectivo } from "@/lib/sena";
import { buscarZonaSyb, type ZonaSyb } from "@/lib/envio-syb";
import {
  ENTRE_CALLES_MAX_CARACTERES,
  NOTA_MAX_CARACTERES,
} from "@/lib/nota-repartidor";

export async function POST(req: NextRequest) {
  try {
    // Límites persistentes (SHOP - Seguridad, punto 2). Van antes que todo,
    // incluso antes del captcha: un bot que prueba tokens también gasta cupo.
    // Una persona real no hace más de un par de pedidos en 10 minutos.
    const ip = ipDe(req);
    const claveIp = huella(ip);
    const [okIpCorto, okIpDia] = await Promise.all([
      dentroDelLimite(`pedido:ip:10m:${claveIp}`, 3, 600),
      dentroDelLimite(`pedido:ip:24h:${claveIp}`, 10, 86_400),
    ]);
    if (!okIpCorto || !okIpDia) {
      return NextResponse.json(
        { error: "Recibimos varios pedidos seguidos desde tu conexión. Esperá unos minutos o escribinos por WhatsApp." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const {
      datos_personales,
      metodo_envio,
      tipo_envio,
      direccion_envio,
      metodo_pago,
      items,
      captchaToken,
      sucursal_correo_id,
      sucursal_correo_nombre,
      entre_calles,
      nota_repartidor,
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
          remoteip: ip,
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

    // Una sola dirección válida: el transporte acepta varias separadas por coma
    // y un pedido podía mandar la confirmación a cientos de personas.
    if (!esEmailValido(datos_personales.email)) {
      return NextResponse.json({ error: "El email no es válido" }, { status: 400 });
    }
    const emailPedido: string = datos_personales.email.trim();

    // Lista cerrada. "andreani" existe en la base por pedidos viejos, pero el
    // checkout ya no lo ofrece y su costo no tendría quién calcularlo acá.
    if (!["retiro", "correo_argentino", "syb"].includes(metodo_envio)) {
      return NextResponse.json({ error: "Método de envío inválido" }, { status: 400 });
    }
    if (!["mercadopago", "transferencia", "efectivo"].includes(metodo_pago)) {
      return NextResponse.json({ error: "Método de pago inválido" }, { status: 400 });
    }

    if (!(await dentroDelLimite(`pedido:email:1h:${huella(emailPedido)}`, 3, 3600))) {
      return NextResponse.json(
        { error: "Ya recibimos varios pedidos con este email en la última hora. Escribinos por WhatsApp si necesitás ayuda." },
        { status: 429 }
      );
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

    // Pedidos del mismo email que siguen esperando el pago. Sirve para dos
    // cosas: no crear dos veces el mismo pedido (un doble click, o un loop),
    // y poner un tope a cuántos puede haber abiertos a la vez.
    const emailComoPatron = emailPedido.replace(/[\\%_]/g, (c) => "\\" + c);
    const { data: pendientes } = await supabase
      .from("pedidos")
      .select("id, numero_pedido, subtotal, metodo_pago, metodo_envio, created_at")
      .ilike("email", emailComoPatron)
      .eq("estado", "pendiente_pago")
      .gte("created_at", new Date(Date.now() - 48 * 3600_000).toISOString())
      .order("created_at", { ascending: false });

    const hace10Min = Date.now() - 10 * 60_000;
    const repetido = (pendientes ?? []).find(
      (x) =>
        new Date(x.created_at).getTime() > hace10Min &&
        Number(x.subtotal) === subtotal &&
        x.metodo_pago === metodo_pago &&
        x.metodo_envio === metodo_envio
    );
    if (repetido) {
      // Mismo pedido hace menos de 10 minutos: se devuelve el que ya existe.
      // El checkout sigue igual (pago, confirmación) sin crear otro ni mandar
      // otro email.
      return NextResponse.json({ id: repetido.id, numero_pedido: repetido.numero_pedido });
    }
    if ((pendientes ?? []).length >= 3) {
      return NextResponse.json(
        { error: "Tenés varios pedidos esperando el pago. Completá alguno o escribinos por WhatsApp." },
        { status: 429 }
      );
    }

    // Config autoritativa desde el server (no confiar en el cliente).
    const {
      recargo_mp_porcentaje: recargoPct,
      envio_gratis_desde: envioGratisDesde,
      sena_efectivo_porcentaje: senaPct,
    } = await getSiteConfig();

    // El costo de envío lo calcula el servidor, nunca el navegador: antes se
    // tomaba el costoEnvio del checkout y con "1" el envío costaba $1
    // (SHOP - Seguridad, punto 4). Correo se recotiza con el paquete armado
    // desde la base; la moto sale de nuestra tabla de zonas, más abajo.
    let costoEnvioBase = 0;
    if (metodo_envio === "correo_argentino") {
      const envio = await costoEnvioCorreo(supabase, direccion_envio?.codigo_postal, tipo_envio, preciados.items);
      if (!envio.ok) {
        return NextResponse.json({ error: envio.error }, { status: envio.status });
      }
      costoEnvioBase = envio.precio;
    }

    // El courier local sí tiene precio autoritativo del lado del servidor: es
    // una tabla nuestra, no una cotización externa. Se recalcula acá y se
    // ignora lo que haya mandado el navegador — si no, cualquiera podía pedir
    // envío en el día a precio cero. Mismo criterio que `resolverPrecios`.
    if (metodo_envio === "syb") {
      const { data: zonasSyb } = await supabase
        .from("envio_syb_zonas")
        .select("*")
        .eq("activo", true);

      const zona = buscarZonaSyb(direccion_envio ?? {}, (zonasSyb ?? []) as ZonaSyb[]);
      if (!zona) {
        return NextResponse.json(
          { error: "Esa dirección no tiene cobertura para envío en el día. Elegí Correo Argentino." },
          { status: 400 }
        );
      }
      costoEnvioBase = Number(zona.precio);
    }

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

    // Los pedidos en efectivo (siempre con retiro en persona) piden un
    // anticipo: el saldo se cobra al retirar, pero la seña asegura que la
    // impresión no se haga a cuenta de nadie. El pedido nace en
    // `pendiente_pago` y lo confirma el webhook de MP o el admin a mano si la
    // seña vino por transferencia. Ver lib/sena.ts.
    const llevaSena = requiereSena(metodo_pago, senaPct);
    const montoSena = llevaSena ? calcularSenaEfectivo(total, senaPct) : null;

    // Con la seña desactivada (senaPct = 0) el efectivo vuelve al
    // comportamiento viejo: se confirma sin pagar nada.
    const estadoInicial: "pendiente_pago" | "pago_confirmado" =
      metodo_pago === "efectivo" && !llevaSena ? "pago_confirmado" : "pendiente_pago";

    // El número se reserva recién acá, con todo validado y el envío cotizado:
    // si algo de lo anterior falla, no se pierde un número.
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

    // Los dos campos opcionales que carga el cliente. Se recortan acá y no se
    // confía en el maxLength del formulario: si la nota pasa de 140, el
    // constraint `pedidos_nota_repartidor_largo` rechaza el INSERT entero y se
    // pierde el pedido, no solo la nota. Vacío se guarda como null para que la
    // etiqueta no dibuje un bloque en blanco.
    //
    // Se descartan cuando nadie va a tocar un timbre: en retiro no hay
    // repartidor, y a una sucursal de Correo el paquete llega a un mostrador.
    const hayEntregaADomicilio =
      metodo_envio !== "retiro" && tipo_envio !== "sucursal";

    const textoOpcional = (v: unknown, max: number): string | null => {
      if (!hayEntregaADomicilio) return null;
      const t = String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
      return t || null;
    };

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
        entre_calles: textoOpcional(entre_calles, ENTRE_CALLES_MAX_CARACTERES),
        nota_repartidor: textoOpcional(nota_repartidor, NOTA_MAX_CARACTERES),
        metodo_envio: metodo_envio,
        tipo_envio: tipo_envio || null,
        costo_envio: costoEnvioFinal,
        metodo_pago: metodo_pago,
        recargo_mp: recargoMP,
        subtotal: subtotal,
        total: total,
        sucursal_correo_id: sucursal_correo_id || null,
        sucursal_correo_nombre: sucursal_correo_nombre || null,
        // El constraint `pedidos_sena_consistente` exige que monto_sena sea
        // null cuando tiene_sena es false, y > 0 cuando es true.
        tiene_sena: llevaSena,
        monto_sena: montoSena,
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
      tiene_sena: llevaSena,
      monto_sena: montoSena,
      sena_pagada: false,
      sena_pagada_at: null,
      saldo_pagado: false,
      saldo_pagado_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: pedidoItems.map((pi, i: number) => ({
        ...pi,
        id: `temp-${i}`,
      })),
    };

    // Datos bancarios: para transferencia (el pedido entero) y también para
    // efectivo con seña, donde el anticipo se puede transferir.
    let datosBancarios: { cbu?: string; alias?: string } | undefined;
    if (metodo_pago === "transferencia" || llevaSena) {
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
