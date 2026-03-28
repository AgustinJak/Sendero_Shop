import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email/send";
import { pedidoConfirmadoEmail, nuevoPedidoAdminEmail } from "@/lib/email/templates";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      datos_personales,
      metodo_envio,
      direccion_envio,
      metodo_pago,
      items,
      costoEnvio,
      recargoMP,
      subtotal,
      total,
    } = body;

    // Validaciones básicas
    if (!datos_personales?.nombre_completo || !datos_personales?.email) {
      return NextResponse.json({ error: "Datos personales incompletos" }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Generar número de pedido
    const { count } = await supabase
      .from("pedidos")
      .select("*", { count: "exact", head: true });

    const numeroPedido = `SS-${String((count || 0) + 1).padStart(5, "0")}`;

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

    // Email al cliente
    const clientEmail = pedidoConfirmadoEmail(fullPedido);
    sendEmail({ to: datos_personales.email, ...clientEmail });

    // Email al admin
    if (process.env.GMAIL_USER) {
      const adminEmail = nuevoPedidoAdminEmail(fullPedido);
      sendEmail({ to: process.env.GMAIL_USER, ...adminEmail });
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
