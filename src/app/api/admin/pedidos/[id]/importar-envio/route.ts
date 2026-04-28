import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";
import { importShipping, PROVINCIA_A_CODIGO } from "@/lib/correo-argentino";
import type { Pedido, PedidoItem } from "@/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Auth
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const service = await createServiceRoleClient();

    // 2. Load pedido with items
    const { data: pedidoRaw, error: fetchErr } = await service
      .from("pedidos")
      .select("*, items:pedido_items(*)")
      .eq("id", id)
      .single();

    if (fetchErr || !pedidoRaw) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const pedido = pedidoRaw as Pedido & { items: PedidoItem[] };

    // 3. Validaciones
    if (pedido.correo_shipping_id) {
      return NextResponse.json(
        { error: "Este envío ya fue importado a MiCorreo" },
        { status: 400 }
      );
    }

    if (pedido.metodo_envio !== "correo_argentino") {
      return NextResponse.json(
        { error: "Solo se pueden importar envíos con método Correo Argentino" },
        { status: 400 }
      );
    }

    if (!pedido.tipo_envio) {
      return NextResponse.json(
        { error: "El pedido no tiene tipo de envío (domicilio / sucursal)" },
        { status: 400 }
      );
    }

    if (pedido.tipo_envio === "sucursal" && !pedido.sucursal_correo_id) {
      return NextResponse.json(
        { error: "El pedido no tiene sucursal seleccionada" },
        { status: 400 }
      );
    }

    if (pedido.tipo_envio === "domicilio" && !pedido.direccion_envio) {
      return NextResponse.json(
        { error: "El pedido no tiene dirección de envío" },
        { status: 400 }
      );
    }

    // 4. Calcular dimensiones y peso sumando los items
    //    (no podemos recuperar las originales, consultamos la tabla productos)
    const productoIds = pedido.items.map((i) => i.producto_id);
    const { data: productos } = await service
      .from("productos")
      .select("id, peso_gr, alto_cm, ancho_cm, largo_cm")
      .in("id", productoIds);

    const productosMap = new Map<string, { peso_gr: number | null; alto_cm: number | null; ancho_cm: number | null; largo_cm: number | null }>();
    productos?.forEach((p) => {
      productosMap.set(p.id, p);
    });

    let pesoTotal = 0;
    let altoMax = 0;
    let anchoMax = 0;
    let largoTotal = 0;
    for (const item of pedido.items) {
      const p = productosMap.get(item.producto_id);
      const peso = p?.peso_gr ?? 500;
      const alto = p?.alto_cm ?? 15;
      const ancho = p?.ancho_cm ?? 15;
      const largo = p?.largo_cm ?? 10;
      pesoTotal += peso * item.cantidad;
      altoMax = Math.max(altoMax, alto);
      anchoMax = Math.max(anchoMax, ancho);
      largoTotal += largo * item.cantidad;
    }

    // 5. Armar dirección de envío (va dentro de shipping.address)
    const deliveryType: "D" | "S" = pedido.tipo_envio === "domicilio" ? "D" : "S";

    let shippingAddress;
    if (deliveryType === "D" && pedido.direccion_envio) {
      const d = pedido.direccion_envio;
      const provinceCode = PROVINCIA_A_CODIGO[d.provincia] || d.provincia;
      // MiCorreo lee `streetName` y `streetNumber` por separado y los muestra
      // ambos correctamente en el portal — NO concatenar la altura en
      // streetName porque queda duplicada (aparece "Calle 123" en calle Y "123"
      // en altura).
      shippingAddress = {
        streetName: d.calle,
        streetNumber: d.numero,
        floor: d.piso || undefined,
        apartment: d.departamento || undefined,
        city: d.localidad,
        provinceCode,
        postalCode: d.codigo_postal,
      };
    } else {
      // Para sucursal la sucursal se identifica por `agency`; la dirección
      // igual se manda mínima para cumplir con el schema.
      shippingAddress = {
        streetName: "Retiro en sucursal",
        streetNumber: "S/N",
        city: "",
        provinceCode: process.env.CORREO_REMITENTE_PROVINCIA || "C",
        postalCode: process.env.CORREO_CP_ORIGEN || "1414",
      };
    }

    // 6. Importar envío
    const result = await importShipping({
      extOrderId: pedido.id,
      orderNumber: pedido.numero_pedido,
      recipient: {
        name: pedido.nombre_cliente,
        phone: pedido.telefono,
        cellPhone: pedido.telefono,
        email: pedido.email,
      },
      shipping: {
        deliveryType,
        agency: deliveryType === "S" ? pedido.sucursal_correo_id! : undefined,
        address: shippingAddress,
        weight: pesoTotal,
        declaredValue: Math.round(pedido.subtotal),
        height: altoMax,
        width: anchoMax,
        length: largoTotal,
      },
    });

    // 7. Guardar resultado en pedido
    const updates: Record<string, unknown> = {
      correo_imported_at: new Date().toISOString(),
      correo_import_response: {
        request: result.requestBody,
        response: result.raw,
      },
    };
    if (result.shippingId) {
      updates.correo_shipping_id = result.shippingId;
      // Si no había tracking_code, usar el shippingId como tracking
      if (!pedido.tracking_code) {
        updates.tracking_code = result.shippingId;
      }
    }

    const { error: updErr } = await service
      .from("pedidos")
      .update(updates)
      .eq("id", id);

    if (updErr) {
      console.error("[importar-envio] error guardando resultado:", updErr.message);
    }

    return NextResponse.json({
      ok: true,
      shippingId: result.shippingId,
      createdAt: result.createdAt,
    });
  } catch (err) {
    const message = (err as Error).message || "Error interno";
    console.error("[importar-envio] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
