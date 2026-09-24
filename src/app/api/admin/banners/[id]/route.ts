import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createServerSupabaseClient } from "@/lib/supabase-server";
import { importarImagenExterna } from "@/lib/imagenes";
import { revalidarTienda } from "@/lib/revalidar";
import { esAdmin } from "@/lib/admin";

export const maxDuration = 30;

/**
 * Si el banner trae un link externo, se importa al bucket optimizado (ver
 * importarImagenExterna). Si no se puede, se guarda el link tal cual: es
 * preferible un banner más pesado a un formulario que no guarda.
 */
async function conImagenImportada<T extends { imagen_url?: string | null }>(
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>,
  body: T
): Promise<T> {
  if (!body.imagen_url) return body;
  try {
    const nueva = await importarImagenExterna(supabase, body.imagen_url, { carpeta: "banners" });
    return nueva ? { ...body, imagen_url: nueva } : body;
  } catch (err) {
    console.error("[banners] no se pudo importar la imagen:", (err as Error).message);
    return body;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!esAdmin(user)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const supabase = await createServiceRoleClient();
  const body = await conImagenImportada(supabase, await req.json());

  const { data, error } = await supabase
    .from("banners")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidarTienda();
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!esAdmin(user)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const supabase = await createServiceRoleClient();

  const { error } = await supabase.from("banners").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidarTienda();

  return NextResponse.json({ ok: true });
}
