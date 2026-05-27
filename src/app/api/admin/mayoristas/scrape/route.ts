import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export type ScrapedModel = {
  id: string;
  titulo: string;
  url: string;
  imagenes: string[];
};

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
  Referer: "https://makerworld.com/",
  Origin: "https://makerworld.com",
};

async function tryMakerWorldAPI(keyword: string, limit: number): Promise<ScrapedModel[]> {
  // MakerWorld usa una API interna — probamos el endpoint más probable
  const url = `https://makerworld.com/api/v1/search/model?keyword=${encodeURIComponent(keyword)}&limit=${limit}&offset=0&order=most_downloaded`;

  const res = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json();

  // Normalizar distintas formas de respuesta que MakerWorld podría devolver
  const hits: unknown[] =
    json.hits ?? json.data ?? json.results ?? json.models ?? json.list ?? [];

  return hits.slice(0, limit).map((m: unknown) => {
    const model = m as Record<string, unknown>;
    const id = String(model.id ?? model.model_id ?? model.design_id ?? "");
    const titulo = String(model.name ?? model.title ?? model.model_name ?? "Modelo");
    const coverUrl = String(model.cover_url ?? model.thumbnail ?? model.cover ?? "");
    const extraImgs: string[] = [];

    if (Array.isArray(model.images)) {
      for (const img of model.images as unknown[]) {
        const imgRec = img as Record<string, unknown>;
        const src = String(imgRec.url ?? imgRec.src ?? imgRec ?? "");
        if (src.startsWith("http")) extraImgs.push(src);
      }
    }

    const imagenes = [...new Set([coverUrl, ...extraImgs].filter((u) => u.startsWith("http")))];

    return {
      id,
      titulo,
      url: `https://makerworld.com/en/models/${id}`,
      imagenes: imagenes.slice(0, 6),
    };
  });
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const keyword = searchParams.get("keyword")?.trim();
  const limit = Math.min(Number(searchParams.get("limit") ?? 5), 10);

  if (!keyword) return NextResponse.json({ error: "keyword requerido" }, { status: 400 });

  try {
    const results = await tryMakerWorldAPI(keyword, limit);
    return NextResponse.json({ results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      {
        results: [],
        error: `No se pudo conectar con MakerWorld (${msg}). Podés agregar imágenes manualmente.`,
      },
      { status: 200 }
    );
  }
}
