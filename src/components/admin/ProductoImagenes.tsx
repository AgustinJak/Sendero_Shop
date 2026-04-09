"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ProductoImagen } from "@/types";

export default function ProductoImagenes({
  productoId,
  imagenes,
}: {
  productoId: string;
  imagenes: ProductoImagen[];
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [sorted, setSorted] = useState(() =>
    [...imagenes].sort((a, b) => a.orden - b.orden)
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with props when they change (after router.refresh)
  const [prevImagenes, setPrevImagenes] = useState(imagenes);
  if (imagenes !== prevImagenes) {
    setPrevImagenes(imagenes);
    setSorted([...imagenes].sort((a, b) => a.orden - b.orden));
  }

  const isMediaFile = (file: File) =>
    file.type.startsWith("image/") || file.type.startsWith("video/");

  // Upload files via signed URL (direct to Supabase Storage)
  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    setUploadError(null);
    const fileArray = Array.from(files).filter(isMediaFile);

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setUploadProgress(`Subiendo ${i + 1}/${fileArray.length}...`);

        // 1. Get signed upload URL from our API
        const signedRes = await fetch("/api/admin/imagenes/signed-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            productoId,
          }),
        });

        if (!signedRes.ok) {
          const err = await signedRes.json();
          setUploadError(err.error || "Error al obtener URL de subida");
          continue;
        }

        const { signedUrl, path, tipo } = await signedRes.json();

        // 2. Upload file directly to Supabase Storage
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!uploadRes.ok) {
          setUploadError(`Error al subir ${file.name}`);
          continue;
        }

        // 3. Build public URL and register in DB
        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/productos/${path}`;

        const registerRes = await fetch("/api/admin/imagenes/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productoId,
            url: publicUrl,
            orden: sorted.length + i,
            tipo,
          }),
        });

        if (!registerRes.ok) {
          const err = await registerRes.json();
          setUploadError(err.error || "Error al registrar archivo");
        }
      }
      router.refresh();
    } catch (e) {
      setUploadError(`Error: ${e instanceof Error ? e.message : "desconocido"}`);
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }, [productoId, sorted.length, router]);

  // File input change
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = "";
    }
  }

  // Drop zone handlers for upload
  function handleDropUpload(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  // Delete media
  async function handleDelete(imagenId: string) {
    await fetch(`/api/admin/imagenes/${imagenId}`, { method: "DELETE" });
    router.refresh();
  }

  // Drag reorder handlers
  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragEnter(idx: number) {
    if (dragIdx === null || dragIdx === idx) return;
    setDragOverIdx(idx);

    // Reorder in state
    setSorted((prev) => {
      const items = [...prev];
      const [moved] = items.splice(dragIdx, 1);
      items.splice(idx, 0, moved);
      setDragIdx(idx);
      return items;
    });
  }

  async function handleDragEnd() {
    setDragIdx(null);
    setDragOverIdx(null);

    // Save new order to DB
    const orden = sorted.map((img, i) => ({ id: img.id, orden: i }));
    await fetch("/api/admin/imagenes/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orden }),
    });
    router.refresh();
  }

  return (
    <div className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-4">
      <h2 className="text-sm font-semibold text-niebla">Imágenes y Videos</h2>

      {/* Media grid with drag reorder */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {sorted.map((media, idx) => (
            <div
              key={media.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={`relative group cursor-grab active:cursor-grabbing transition-all ${
                dragIdx === idx ? "opacity-50 scale-95" : ""
              } ${dragOverIdx === idx ? "ring-2 ring-purpura rounded-lg" : ""}`}
            >
              {media.tipo === "video" ? (
                <div className="relative w-full aspect-square bg-navy-deep rounded-lg overflow-hidden">
                  <video
                    src={media.url}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                  />
                  {/* Video play icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 bg-black/60 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                <img
                  src={media.url}
                  alt={media.alt_text || ""}
                  className="w-full aspect-square object-cover rounded-lg bg-navy-deep"
                />
              )}
              <button
                onClick={() => handleDelete(media.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                x
              </button>
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                {idx + 1}
              </span>
              {media.tipo === "video" && (
                <span className="absolute bottom-1 right-1 text-[10px] bg-purpura/80 text-white px-1.5 py-0.5 rounded font-bold">
                  VIDEO
                </span>
              )}
              {idx === 0 && (
                <span className="absolute top-1 left-1 text-[10px] bg-ambar/80 text-navy-deep px-1.5 py-0.5 rounded font-bold">
                  Principal
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {sorted.length > 1 && (
        <p className="text-[10px] text-lavanda/30 text-center">
          Arrastrá para reordenar. La primera es la principal.
        </p>
      )}

      {/* Upload error */}
      {uploadError && (
        <p className="text-xs text-red-400 text-center">{uploadError}</p>
      )}

      {/* Drop zone for upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (e.dataTransfer.types.includes("Files")) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDropUpload}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full py-6 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors ${
          dragOver
            ? "border-purpura bg-purpura/10 text-purpura"
            : "border-lavanda/20 hover:border-purpura/40 text-lavanda/60 hover:text-lavanda-light"
        }`}
      >
        {uploading ? (
          <span className="text-sm animate-pulse">{uploadProgress || "Subiendo..."}</span>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-1 opacity-50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-sm">Arrastrá archivos o hacé clic</span>
            <span className="text-[10px] text-lavanda/30 mt-0.5">JPG, PNG, WebP — MP4, WebM (hasta 100 MB)</span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/mp4,video/webm"
          multiple
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </div>
    </div>
  );
}
