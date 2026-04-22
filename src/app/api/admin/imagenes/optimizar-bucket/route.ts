import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

// Config
const BUCKET = "productos";
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 80;
const SKIP_IF_SMALLER_THAN = 200 * 1024; // 200 KB — no vale la pena recomprimir

// Archivos que NO se optimizan (videos, ya-webp chicos, etc.)
const SKIP_EXTENSIONS = [".mp4", ".webm", ".mov", ".svg", ".gif"];

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min por ejecución (Vercel Pro) — en Hobby queda en 60s

type Stat = {
  path: string;
  oldSize: number;
  newSize: number;
  ratio: number;
  action: "optimized" | "skipped-small" | "skipped-video" | "skipped-already-optimized" | "error";
  error?: string;
};

type FileRow = {
  name: string;
  metadata?: { size?: number } | null;
};

async function listAllFiles(
  service: Awaited<ReturnType<typeof createServiceRoleClient>>,
  prefix = ""
): Promise<Array<{ path: string; size: number }>> {
  const out: Array<{ path: string; size: number }> = [];
  const { data, error } = await service.storage.from(BUCKET).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" },
  });
  if (error) throw new Error(`list(${prefix}): ${error.message}`);
  for (const item of (data as FileRow[]) || []) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.metadata && typeof item.metadata.size === "number") {
      // file
      out.push({ path: fullPath, size: item.metadata.size });
    } else {
      // folder — recurse
      const sub = await listAllFiles(service, fullPath);
      out.push(...sub);
    }
  }
  return out;
}

export async function POST(req: NextRequest) {
  // Auth
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1";
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 50; // default 50 por tanda (evitar timeouts)

  const service = await createServiceRoleClient();

  let files: Array<{ path: string; size: number }>;
  try {
    files = await listAllFiles(service);
  } catch (err) {
    return NextResponse.json(
      { error: `Error listando bucket: ${(err as Error).message}` },
      { status: 500 }
    );
  }

  // Ordenar de mayor a menor (prioridad al ahorro) y tomar hasta `limit` no-video
  const candidates = files
    .filter((f) => !SKIP_EXTENSIONS.some((ext) => f.path.toLowerCase().endsWith(ext)))
    .sort((a, b) => b.size - a.size);

  const stats: Stat[] = [];
  let totalOldBytes = 0;
  let totalNewBytes = 0;
  let processedCount = 0;

  for (const f of candidates) {
    if (processedCount >= limit) break;

    // Skip si ya es chico (aunque sea PNG, 200KB ya es aceptable)
    if (f.size < SKIP_IF_SMALLER_THAN) {
      stats.push({
        path: f.path,
        oldSize: f.size,
        newSize: f.size,
        ratio: 1,
        action: "skipped-small",
      });
      continue;
    }

    // Skip si ya es .webp pequeño (se convirtió en una tanda previa)
    const isWebp = f.path.toLowerCase().endsWith(".webp");

    try {
      // 1. Download
      const { data: blob, error: dlErr } = await service.storage
        .from(BUCKET)
        .download(f.path);
      if (dlErr || !blob) throw new Error(dlErr?.message || "download failed");

      const inputBuffer = Buffer.from(await blob.arrayBuffer());

      // 2. Transform
      let transformed = sharp(inputBuffer, { failOn: "none" }).rotate();
      const meta = await transformed.metadata();
      if (meta.width && meta.width > MAX_WIDTH) {
        transformed = transformed.resize({ width: MAX_WIDTH, withoutEnlargement: true });
      }
      const outputBuffer = await transformed
        .webp({ quality: WEBP_QUALITY, effort: 5 })
        .toBuffer();

      // Skip si no hubo reducción significativa (<10%)
      if (outputBuffer.length > f.size * 0.9) {
        stats.push({
          path: f.path,
          oldSize: f.size,
          newSize: f.size,
          ratio: 1,
          action: "skipped-already-optimized",
        });
        continue;
      }

      processedCount += 1;
      totalOldBytes += f.size;
      totalNewBytes += outputBuffer.length;

      if (dryRun) {
        stats.push({
          path: f.path,
          oldSize: f.size,
          newSize: outputBuffer.length,
          ratio: outputBuffer.length / f.size,
          action: "optimized",
        });
        continue;
      }

      // 3. Calcular nuevo path (.webp)
      const newPath = isWebp
        ? f.path
        : f.path.replace(/\.(png|jpe?g|avif)$/i, ".webp");

      // 4. Subir nuevo (upsert si mismo nombre, sino new + delete old)
      const { error: upErr } = await service.storage
        .from(BUCKET)
        .upload(newPath, outputBuffer, {
          contentType: "image/webp",
          cacheControl: "31536000",
          upsert: true,
        });
      if (upErr) throw new Error(`upload: ${upErr.message}`);

      // 5. Obtener nueva URL pública
      const { data: { publicUrl: newUrl } } = service.storage
        .from(BUCKET)
        .getPublicUrl(newPath);

      // 6. Obtener URL pública vieja para matchear en DB
      const { data: { publicUrl: oldUrl } } = service.storage
        .from(BUCKET)
        .getPublicUrl(f.path);

      // 7. Actualizar producto_imagenes.url
      if (oldUrl !== newUrl) {
        const { error: updErr } = await service
          .from("producto_imagenes")
          .update({ url: newUrl })
          .eq("url", oldUrl);
        if (updErr) throw new Error(`db update: ${updErr.message}`);

        // 8. También actualizar banners si usan esta imagen
        await service
          .from("banners")
          .update({ imagen_url: newUrl })
          .eq("imagen_url", oldUrl);

        // 9. Colecciones cover
        await service
          .from("colecciones")
          .update({ imagen_cover: newUrl })
          .eq("imagen_cover", oldUrl);

        // 10. Borrar el original
        const { error: delErr } = await service.storage.from(BUCKET).remove([f.path]);
        if (delErr) throw new Error(`delete old: ${delErr.message}`);
      }

      stats.push({
        path: f.path,
        oldSize: f.size,
        newSize: outputBuffer.length,
        ratio: outputBuffer.length / f.size,
        action: "optimized",
      });
    } catch (err) {
      stats.push({
        path: f.path,
        oldSize: f.size,
        newSize: f.size,
        ratio: 1,
        action: "error",
        error: (err as Error).message,
      });
    }
  }

  return NextResponse.json({
    dryRun,
    limit,
    totalFilesInBucket: files.length,
    candidatesFound: candidates.length,
    processedCount,
    totalOldBytes,
    totalNewBytes,
    savedBytes: totalOldBytes - totalNewBytes,
    savedPercent:
      totalOldBytes > 0
        ? Math.round((1 - totalNewBytes / totalOldBytes) * 100)
        : 0,
    stats,
  });
}
