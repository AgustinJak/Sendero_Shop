import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from "@/lib/supabase-server";
import {
  generateToken,
  validateBorradorItem,
  DEFAULT_EXPIRACION_HORAS,
} from "@/lib/borrador";
import type { MetodoPago, PedidoBorradorItem, SenaTipo } from "@/types";

/**
 * Listar borradores. Soporta filtro opcional por estado.
 *   GET /api/admin/borradores
 *   GET /api/admin/borradores?estado=pendiente
 */
export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const service = await createServiceRoleClient();
  const estado = req.nextUrl.searchParams.get("estado");

  let query = service
    .from("pedidos_borrador")
    .select("*")
    .order("created_at", { ascending: false });

  if (estado) {
    query = query.eq("estado", estado);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ borradores: data ?? [] });
}

interface CreateBody {
  notas_admin?: string;
  items: unknown[];
  descuento_monto?: number;
  descuento_porcentaje?: number;
  costo_envio_override?: number | null;
  envio_gratis?: boolean;
  metodos_pago_permitidos?: MetodoPago[] | null;
  paquete_peso_gr?: number | null;
  paquete_alto_cm?: number | null;
  paquete_ancho_cm?: number | null;
  paquete_largo_cm?: number | null;
  sena_tipo?: SenaTipo | null;
  sena_valor?: number | null;
  expiracion_horas?: number; // override del default 48
}

/**
 * Crear un nuevo borrador.
 *   POST /api/admin/borradores
 *
 * Si un item viene con `producto_id`, hidratamos `sku` y dimensiones desde la
 * tabla `productos` automáticamente (snapshot — si después cambian, el
 * borrador conserva los valores del momento de creación).
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = (await req.json()) as CreateBody;

    // 1. Validar items
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Tenés que agregar al menos un item" },
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

    // 2. Hidratar items de catálogo: completar sku + dimensiones desde la DB.
    //    El admin puede haber sobreescrito alguno; respetamos lo que mandó.
    const service = await createServiceRoleClient();
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
        // Solo rellenar lo que el admin no haya provisto explícitamente.
        item.sku = item.sku ?? p.sku ?? null;
        item.peso_gr = item.peso_gr ?? p.peso_gr ?? undefined;
        item.alto_cm = item.alto_cm ?? p.alto_cm ?? undefined;
        item.ancho_cm = item.ancho_cm ?? p.ancho_cm ?? undefined;
        item.largo_cm = item.largo_cm ?? p.largo_cm ?? undefined;
      }
    }

    // 3. Validar descuento (XOR — solo uno > 0)
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

    // 4. Validar paquete: si seteás algún campo, tenés que setear los 4
    const paqueteCampos = [
      body.paquete_peso_gr,
      body.paquete_alto_cm,
      body.paquete_ancho_cm,
      body.paquete_largo_cm,
    ];
    const paqueteParcial =
      paqueteCampos.some((v) => v != null) &&
      !paqueteCampos.every((v) => v != null);
    if (paqueteParcial) {
      return NextResponse.json(
        {
          error:
            "Si definís dimensiones del paquete, tenés que poner los 4 campos (peso, alto, ancho, largo)",
        },
        { status: 400 }
      );
    }

    // 5a. Validar seña
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

    // 5b. Calcular expiración
    const horas =
      body.expiracion_horas && body.expiracion_horas > 0
        ? body.expiracion_horas
        : DEFAULT_EXPIRACION_HORAS;
    const expiresAt = new Date(Date.now() + horas * 60 * 60 * 1000);

    // 6. Insertar
    const token = generateToken();
    const { data, error } = await service
      .from("pedidos_borrador")
      .insert({
        token,
        notas_admin: body.notas_admin?.trim() || null,
        items,
        descuento_monto: descMonto,
        descuento_porcentaje: descPct,
        costo_envio_override: body.envio_gratis
          ? 0
          : (body.costo_envio_override ?? null),
        envio_gratis: body.envio_gratis ?? false,
        metodos_pago_permitidos: body.metodos_pago_permitidos ?? null,
        paquete_peso_gr: body.paquete_peso_gr ?? null,
        paquete_alto_cm: body.paquete_alto_cm ?? null,
        paquete_ancho_cm: body.paquete_ancho_cm ?? null,
        paquete_largo_cm: body.paquete_largo_cm ?? null,
        sena_tipo: senaTipo,
        sena_valor: senaValor,
        expires_at: expiresAt.toISOString(),
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[borradores POST] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ borrador: data });
  } catch (err) {
    const message = (err as Error).message || "Error interno";
    console.error("[borradores POST] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
