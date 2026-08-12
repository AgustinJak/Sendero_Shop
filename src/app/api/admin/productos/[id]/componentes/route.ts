import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

interface ComponenteInput {
  producto_id: string;
  cantidad: number;
}

/**
 * Reemplaza los componentes de un kit.
 *
 * La base ya impide autoreferencia, duplicados y cantidades no positivas; acá
 * se validan igual para devolver un mensaje entendible en vez de un error de
 * constraint, y para cortar el anidado de kits, que la base no puede ver.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: kitId } = await params;
  const body = await req.json();
  const entrada: ComponenteInput[] = Array.isArray(body.componentes) ? body.componentes : [];

  const sc = await createServiceRoleClient();

  // El producto tiene que existir y estar marcado como kit.
  const { data: kit } = await sc
    .from("productos")
    .select("id, es_kit")
    .eq("id", kitId)
    .maybeSingle();

  if (!kit) return NextResponse.json({ error: "El producto no existe" }, { status: 404 });
  if (!kit.es_kit) {
    return NextResponse.json(
      { error: "El producto no está marcado como kit" },
      { status: 400 }
    );
  }

  // Normalizar y validar la entrada.
  const vistos = new Set<string>();
  const componentes: ComponenteInput[] = [];
  for (const c of entrada) {
    const cantidad = Math.floor(Number(c?.cantidad));
    if (!c?.producto_id || typeof c.producto_id !== "string") {
      return NextResponse.json({ error: "Componente sin producto" }, { status: 400 });
    }
    if (!Number.isFinite(cantidad) || cantidad < 1 || cantidad > 999) {
      return NextResponse.json(
        { error: "La cantidad de cada componente tiene que estar entre 1 y 999" },
        { status: 400 }
      );
    }
    if (c.producto_id === kitId) {
      return NextResponse.json(
        { error: "Un kit no puede incluirse a sí mismo" },
        { status: 400 }
      );
    }
    if (vistos.has(c.producto_id)) {
      return NextResponse.json(
        { error: "Hay un producto repetido: subí la cantidad en vez de agregarlo dos veces" },
        { status: 400 }
      );
    }
    vistos.add(c.producto_id);
    componentes.push({ producto_id: c.producto_id, cantidad });
  }

  if (componentes.length > 0) {
    // Todos deben existir y ninguno puede ser otro kit: un kit dentro de otro
    // haría que el contenido y el ahorro dejen de poder calcularse derecho.
    const { data: productos } = await sc
      .from("productos")
      .select("id, nombre, es_kit")
      .in("id", componentes.map((c) => c.producto_id));

    const encontrados = productos ?? [];
    if (encontrados.length !== componentes.length) {
      return NextResponse.json(
        { error: "Alguno de los productos elegidos ya no existe" },
        { status: 400 }
      );
    }
    const anidado = encontrados.find((p) => p.es_kit);
    if (anidado) {
      return NextResponse.json(
        { error: `"${anidado.nombre}" es un kit: no se puede poner un kit dentro de otro` },
        { status: 400 }
      );
    }
  }

  // Reemplazo completo: es lo que espera el editor, que manda la lista entera.
  const { error: delError } = await sc
    .from("kit_componentes")
    .delete()
    .eq("kit_id", kitId);

  if (delError) {
    console.error("Error borrando componentes:", delError);
    return NextResponse.json({ error: "Error al guardar los componentes" }, { status: 500 });
  }

  if (componentes.length > 0) {
    const { error: insError } = await sc.from("kit_componentes").insert(
      componentes.map((c, i) => ({
        kit_id: kitId,
        producto_id: c.producto_id,
        cantidad: c.cantidad,
        orden: i,
      }))
    );

    if (insError) {
      console.error("Error insertando componentes:", insError);
      return NextResponse.json({ error: "Error al guardar los componentes" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, total: componentes.length });
}
