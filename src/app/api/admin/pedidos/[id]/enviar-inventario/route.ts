import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import {
  enviarConReintentos,
  type PedidoInventarioPayload,
  type InventarioItem,
} from "@/lib/inventario-webhook";
import type { Pedido, PedidoItem, VarianteSeleccion } from "@/types";

type PedidoItemConSku = PedidoItem & {
  productos?: { sku: string | null } | null;
};

const SHOP_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sendero3d.com";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Auth (admin)
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const service = await createServiceRoleClient();

    // 2. Cargar pedido + items + sku del producto
    const { data: pedidoRaw, error: fetchErr } = await service
      .from("pedidos")
      .select("*, items:pedido_items(*, productos(sku))")
      .eq("id", id)
      .single();

    if (fetchErr || !pedidoRaw) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const pedido = pedidoRaw as Omit<Pedido, "items"> & { items: PedidoItemConSku[] };

    // 3. Validaciones
    if (pedido.enviado_inventario) {
      return NextResponse.json(
        { error: "Este pedido ya fue enviado al inventario" },
        { status: 400 }
      );
    }

    if (pedido.estado === "cancelado") {
      return NextResponse.json(
        { error: "No se pueden enviar pedidos cancelados" },
        { status: 400 }
      );
    }

    if (pedido.estado === "pendiente_pago") {
      return NextResponse.json(
        { error: "El pedido tiene que estar confirmado para enviarlo al inventario" },
        { status: 400 }
      );
    }

    if (!pedido.items || pedido.items.length === 0) {
      return NextResponse.json(
        { error: "El pedido no tiene items" },
        { status: 400 }
      );
    }

    // 4. Mapear items al formato del inventario
    const items: InventarioItem[] = pedido.items.map((it) => ({
      sku: it.productos?.sku ?? null,
      nombre_producto: it.nombre_producto,
      cantidad: it.cantidad,
      precio_unitario: it.precio_unitario,
      opciones_seleccionadas: (it.opciones_seleccionadas || []).map(
        (op: VarianteSeleccion) => ({
          grupo: op.grupo_nombre,
          nombre: op.opcion_valor,
          precio_extra: op.precio_adicional ?? 0,
        })
      ),
      subtotal: it.subtotal,
    }));

    // 5. Mapear dirección al formato del inventario (los nombres de campos
    //    difieren: localidad → ciudad, codigo_postal → cp, departamento → depto)
    const direccion = pedido.direccion_envio
      ? {
          calle: pedido.direccion_envio.calle,
          numero: pedido.direccion_envio.numero,
          piso: pedido.direccion_envio.piso || undefined,
          depto: pedido.direccion_envio.departamento || undefined,
          ciudad: pedido.direccion_envio.localidad,
          provincia: pedido.direccion_envio.provincia,
          cp: pedido.direccion_envio.codigo_postal,
        }
      : undefined;

    // 6. Armar payload
    const payload: PedidoInventarioPayload = {
      evento: "pedido.confirmado",
      numero_pedido: pedido.numero_pedido,
      estado_shop: pedido.estado as PedidoInventarioPayload["estado_shop"],
      cliente: {
        nombre: pedido.nombre_cliente,
        email: pedido.email,
        telefono: pedido.telefono,
        dni: pedido.dni,
      },
      direccion_envio: direccion,
      metodo_envio: pedido.metodo_envio,
      tipo_envio: pedido.tipo_envio,
      costo_envio: pedido.costo_envio || 0,
      metodo_pago: pedido.metodo_pago,
      recargo_mp: pedido.recargo_mp || 0,
      subtotal: pedido.subtotal,
      total: pedido.total,
      sucursal_correo: pedido.sucursal_correo_id
        ? {
            id: pedido.sucursal_correo_id,
            nombre: pedido.sucursal_correo_nombre || undefined,
          }
        : null,
      shop_url: `${SHOP_URL}/admin/pedidos/${pedido.id}`,
      items,
    };

    // 7. Enviar al inventario (con reintentos para 5xx/network)
    const result = await enviarConReintentos(payload);

    // 8. Marcar como enviado en el shop
    const { error: updErr } = await service
      .from("pedidos")
      .update({
        enviado_inventario: true,
        inventario_pedido_id: result.pedidoId,
        inventario_enviado_en: new Date().toISOString(),
      })
      .eq("id", id);

    if (updErr) {
      console.error("[enviar-inventario] error guardando flag:", updErr.message);
      // No tiramos error — el pedido ya está en el inventario, solo no marcamos.
      // El admin puede reenviar y va a recibir duplicate=true sin daño.
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = (err as Error).message || "Error interno";
    console.error("[enviar-inventario] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
