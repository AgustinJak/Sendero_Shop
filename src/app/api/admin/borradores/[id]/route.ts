import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import type { PedidoBorrador } from "@/types";

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
 * Actualizar un borrador. Solo permitido en estado 'pendiente'.
 * Únicas acciones soportadas:
 *   - estado: "cancelado" — cancela el borrador
 *   - notas_admin: edita las notas (no afecta el flujo del cliente)
 *
 * Para editar items/precios: cancelar y crear uno nuevo (más simple y evita
 * que el cliente vea cambios mientras tiene el link abierto).
 *
 *   PATCH /api/admin/borradores/[id]
 *   Body: { estado?: "cancelado", notas_admin?: string }
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

  if (body.notas_admin !== undefined) {
    updates.notas_admin = body.notas_admin?.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No hay cambios para aplicar" },
      { status: 400 }
    );
  }

  const { error } = await service
    .from("pedidos_borrador")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
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
