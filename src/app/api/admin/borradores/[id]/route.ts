import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import { validateBorradorItem } from "@/lib/borrador";
import type { PedidoBorrador, PedidoBorradorItem, SenaTipo } from "@/types";

/**
 * Detalle de un borrador.
 *   GET /api/admin/borradores/[id]
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const service = await createServiceRoleClient();
  const { data, error } = await service
    .from("pedidos_borrador")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Borrador no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ borrador: data });
}

/**
 * Actualizar un borrador.
 *   PATCH /api/admin/borradores/[id]
 *
 * Modo "cancelar" (en cualquier momento mientras esté pendiente):
 *   Body: { estado: "cancelado" }
 *
 * Modo "editar metadata" (notas, en cualquier estado):
 *   Body: { notas_admin?: string }
 *
 * Modo "editar contenido" (solo en 'pendiente'):
 *   Body: { items, descuento_*, costo_envio_override, envio_gratis,
 *           metodos_pago_permitidos, paquete_*, sena_tipo, sena_valor,
 *           expiracion_horas, notas_admin }
 *   IMPORTANTE: si el cliente tiene el link abierto, verá los cambios al refrescar.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const service = await createServiceRoleClient();

  // Cargar para validar estado actual
  const { data: actual } = await service
    .from("pedidos_borrador")
    .select("estado")
    .eq("id", id)
    .single<Pick<PedidoBorrador, "estado">>();
  if (!actual) {
    return NextResponse.json({ error: "Borrador no encontrado" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  // --- Cancelar ---
  if (body.estado !== undefined) {
    if (body.estado !== "cancelado") {
      return NextResponse.json(
        { error: "Solo se puede cambiar el estado a 'cancelado'" },
        { status: 400 }
      );
    }
    if (actual.estado !== "pendiente") {
      return NextResponse.json(
        { error: `No se puede cancelar un borrador en estado '${actual.estado}'` },
        { status: 400 }
      );
    }
    updates.estado = "cancelado";
  }

  // --- Notas (cualquier estado) ---
  if (body.notas_admin !== undefined) {
    updates.notas_admin = body.notas_admin?.trim() || null;
  }

  // --- Editar contenido (solo si está pendiente) ---
  const editFields = [
    "items",
    "descuento_monto",
    "descuento_porcentaje",
    "costo_envio_override",
    "envio_gratis",
    "metodos_pago_permitidos",
    "paquete_peso_gr",
    "paquete_alto_cm",
    "paquete_ancho_cm",
    "paquete_largo_cm",
    "sena_tipo",
    "sena_valor",
    "expiracion_horas",
  ];
  const tryingToEdit = editFields.some((f) => body[f] !== undefined);

  if (tryingToEdit) {
    if (actual.estado !== "pendiente") {
      return NextResponse.json(
        {
          error: `No se puede editar el contenido de un borrador en estado '${actual.estado}'`,
        },
        { status: 400 }
      );
    }

    // 1. Validar items si vinieron
    if (body.items !== undefined) {
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json(
          { error: "Tenés que tener al menos un item" },
          { status: 400 }
        );
      }
      const items: PedidoBorradorItem[] = [];
      for (let i = 0; i < body.items.length; i++) {
        try {
          items.push(validateBorradorItem(body.items[i], i));
        } catch (err) {
          return NextResponse.json(
            { error: (err as Error).message },
            { status: 400 }
          );
        }
      }
      // Hidratar items de catálogo con sku + dims
      const productoIds = items
        .map((i) => i.producto_id)
        .filter((id): id is string => Boolean(id));
      if (productoIds.length > 0) {
        const { data: productos } = await service
          .from("productos")
          .select("id, sku, peso_gr, alto_cm, ancho_cm, largo_cm")
          .in("id", productoIds);
        const map = new Map(productos?.map((p) => [p.id, p]) ?? []);
        for (const item of items) {
          if (!item.producto_id) continue;
          const p = map.get(item.producto_id);
          if (!p) continue;
          item.sku = item.sku ?? p.sku ?? null;
          item.peso_gr = item.peso_gr ?? p.peso_gr ?? undefined;
          item.alto_cm = item.alto_cm ?? p.alto_cm ?? undefined;
          item.ancho_cm = item.ancho_cm ?? p.ancho_cm ?? undefined;
          item.largo_cm = item.largo_cm ?? p.largo_cm ?? undefined;
        }
      }
      updates.items = items;
    }

    // 2. Descuento (XOR)
    if (body.descuento_monto !== undefined || body.descuento_porcentaje !== undefined) {
      const descMonto = body.descuento_monto ?? 0;
      const descPct = body.descuento_porcentaje ?? 0;
      if (descMonto < 0 || descPct < 0) {
        return NextResponse.json(
          { error: "Los descuentos no pueden ser negativos" },
          { status: 400 }
        );
      }
      if (descMonto > 0 && descPct > 0) {
        return NextResponse.json(
          { error: "Usá monto fijo o porcentaje, no ambos" },
          { status: 400 }
        );
      }
      if (descPct > 100) {
        return NextResponse.json(
          { error: "El porcentaje de descuento no puede pasar 100%" },
          { status: 400 }
        );
      }
      updates.descuento_monto = descMonto;
      updates.descuento_porcentaje = descPct;
    }

    // 3. Envío
    if (body.envio_gratis !== undefined) {
      updates.envio_gratis = body.envio_gratis;
    }
    if (body.costo_envio_override !== undefined) {
      updates.costo_envio_override = body.envio_gratis ? 0 : body.costo_envio_override;
    }

    // 4. Métodos de pago
    if (body.metodos_pago_permitidos !== undefined) {
      updates.metodos_pago_permitidos = body.metodos_pago_permitidos;
    }

    // 5. Paquete: todo-o-nada (los 4 campos)
    const paqueteFields = [
      "paquete_peso_gr",
      "paquete_alto_cm",
      "paquete_ancho_cm",
      "paquete_largo_cm",
    ] as const;
    const paqueteTouched = paqueteFields.some((f) => body[f] !== undefined);
    if (paqueteTouched) {
      const vals = paqueteFields.map((f) => body[f]);
      const algunoNoNull = vals.some((v) => v != null);
      const todosNoNull = vals.every((v) => v != null);
      if (algunoNoNull && !todosNoNull) {
        return NextResponse.json(
          {
            error:
              "Si definís dimensiones del paquete, tenés que poner los 4 campos (peso, alto, ancho, largo)",
          },
          { status: 400 }
        );
      }
      for (const f of paqueteFields) {
        if (body[f] !== undefined) updates[f] = body[f];
      }
    }

    // 6. Seña
    if (body.sena_tipo !== undefined || body.sena_valor !== undefined) {
      let senaTipo: SenaTipo | null = null;
      let senaValor: number | null = null;
      if (body.sena_tipo && body.sena_valor != null) {
        if (body.sena_tipo !== "porcentaje" && body.sena_tipo !== "monto_fijo") {
          return NextResponse.json(
            { error: "Tipo de seña inválido" },
            { status: 400 }
          );
        }
        if (body.sena_valor <= 0) {
          return NextResponse.json(
            { error: "El valor de la seña tiene que ser positivo" },
            { status: 400 }
          );
        }
        if (body.sena_tipo === "porcentaje") {
          if (body.sena_valor < 10 || body.sena_valor > 90) {
            return NextResponse.json(
              { error: "La seña en porcentaje tiene que estar entre 10% y 90%" },
              { status: 400 }
            );
          }
        }
        senaTipo = body.sena_tipo;
        senaValor = body.sena_valor;
      }
      updates.sena_tipo = senaTipo;
      updates.sena_valor = senaValor;
    }

    // 7. Expiración: recalcular desde ahora
    if (body.expiracion_horas !== undefined && body.expiracion_horas > 0) {
      const expiresAt = new Date(Date.now() + body.expiracion_horas * 60 * 60 * 1000);
      updates.expires_at = expiresAt.toISOString();
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No hay cambios para aplicar" },
      { status: 400 }
    );
  }

  const { data, error } = await service
    .from("pedidos_borrador")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, borrador: data });
}

/**
 * Eliminar un borrador. Solo permitido si está cancelado o expirado.
 * Pedidos convertidos no se eliminan (queda el registro histórico).
 *
 *   DELETE /api/admin/borradores/[id]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const service = await createServiceRoleClient();

  const { data: actual } = await service
    .from("pedidos_borrador")
    .select("estado")
    .eq("id", id)
    .single<Pick<PedidoBorrador, "estado">>();
  if (!actual) {
    return NextResponse.json({ error: "Borrador no encontrado" }, { status: 404 });
  }

  if (actual.estado === "convertido") {
    return NextResponse.json(
      { error: "No se puede eliminar un borrador ya convertido" },
      { status: 400 }
    );
  }
  if (actual.estado === "pendiente") {
    return NextResponse.json(
      {
        error:
          "Cancelá el borrador antes de eliminarlo, así el cliente recibe un mensaje claro si abre el link",
      },
      { status: 400 }
    );
  }

  const { error } = await service
    .from("pedidos_borrador")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
