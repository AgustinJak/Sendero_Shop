"use client";

import { useState } from "react";

type Stat = {
  path: string;
  oldSize: number;
  newSize: number;
  ratio: number;
  action: string;
  error?: string;
};

type Result = {
  dryRun: boolean;
  limit: number;
  totalFilesInBucket: number;
  candidatesFound: number;
  processedCount: number;
  totalOldBytes: number;
  totalNewBytes: number;
  savedBytes: number;
  savedPercent: number;
  stats: Stat[];
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function OptimizarBucketButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(dryRun: boolean, limit: number) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(
        `/api/admin/imagenes/optimizar-bucket?dryRun=${dryRun ? 1 : 0}&limit=${limit}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error desconocido");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-niebla">
          Optimizar imágenes del bucket
        </h2>
        <p className="text-xs text-lavanda/60">
          Convierte PNG/JPG → WebP, resize a 1600px, calidad 80. Actualiza URLs en DB
          y borra los originales. Procesa los archivos más grandes primero, en tandas.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => run(true, 50)}
          disabled={loading}
          className="px-4 py-2 bg-lavanda/10 hover:bg-lavanda/20 text-lavanda-light text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "Dry-run (50)"}
        </button>
        <button
          onClick={() => run(false, 20)}
          disabled={loading}
          className="px-4 py-2 bg-purpura/20 hover:bg-purpura/30 text-purpura text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "..." : "Optimizar 20"}
        </button>
        <button
          onClick={() => run(false, 50)}
          disabled={loading}
          className="px-4 py-2 bg-purpura hover:bg-purpura/80 text-niebla text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Procesando..." : "Optimizar 50"}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <Stat label="Total bucket" value={`${result.totalFilesInBucket} archivos`} />
            <Stat label="Procesados" value={`${result.processedCount} / ${result.candidatesFound}`} />
            <Stat label="Ahorro" value={formatBytes(result.savedBytes)} />
            <Stat label="% reducción" value={`${result.savedPercent}%`} />
          </div>

          {result.dryRun && (
            <div className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-2">
              Modo dry-run: ningún archivo fue modificado.
            </div>
          )}

          <div className="max-h-64 overflow-y-auto border border-lavanda/10 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-navy-deep sticky top-0">
                <tr className="text-left text-lavanda/40">
                  <th className="px-2 py-1 font-normal">Archivo</th>
                  <th className="px-2 py-1 font-normal text-right">Antes</th>
                  <th className="px-2 py-1 font-normal text-right">Después</th>
                  <th className="px-2 py-1 font-normal">Acción</th>
                </tr>
              </thead>
              <tbody>
                {result.stats.map((s) => (
                  <tr key={s.path} className="border-t border-lavanda/5">
                    <td className="px-2 py-1 font-mono text-lavanda-light truncate max-w-xs" title={s.path}>
                      {s.path}
                    </td>
                    <td className="px-2 py-1 text-right text-lavanda/60">{formatBytes(s.oldSize)}</td>
                    <td className="px-2 py-1 text-right text-lavanda/60">
                      {s.action === "optimized" ? formatBytes(s.newSize) : "-"}
                    </td>
                    <td className="px-2 py-1 text-lavanda/40">
                      {s.action === "optimized" && (
                        <span className="text-green-400">-{Math.round((1 - s.ratio) * 100)}%</span>
                      )}
                      {s.action === "skipped-small" && <span>chico</span>}
                      {s.action === "skipped-video" && <span>video</span>}
                      {s.action === "skipped-already-optimized" && <span>ya opt.</span>}
                      {s.action === "error" && (
                        <span className="text-red-400" title={s.error}>error</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-navy-deep rounded-lg px-3 py-2">
      <p className="text-[10px] text-lavanda/40 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-niebla font-medium">{value}</p>
    </div>
  );
}
