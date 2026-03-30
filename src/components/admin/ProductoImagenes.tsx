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

  // Upload files
  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("producto_id", productoId);
        formData.append("orden", String(sorted.length));

        await fetch("/api/admin/imagenes", {
          method: "POST",
          body: formData,
        });
      }
      router.refresh();
    } finally {
      setUploading(false);
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

  // Delete image
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
      <h2 className="text-sm font-semibold text-niebla">Imágenes</h2>

      {/* Image grid with drag reorder */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {sorted.map((img, idx) => (
            <div
              key={img.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={`relative group cursor-grab active:cursor-grabbing transition-all ${
                dragIdx === idx ? "opacity-50 scale-95" : ""
              } ${dragOverIdx === idx ? "ring-2 ring-purpura rounded-lg" : ""}`}
            >
              <img
                src={img.url}
                alt={img.alt_text || ""}
                className="w-full aspect-square object-cover rounded-lg bg-navy-deep"
              />
              <button
                onClick={() => handleDelete(img.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                x
              </button>
              <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                {idx + 1}
              </span>
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
          Arrastrá las imágenes para reordenarlas. La primera es la principal.
        </p>
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
          <span className="text-sm">Subiendo...</span>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-1 opacity-50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-sm">Arrastrá imágenes o hacé clic</span>
            <span className="text-[10px] text-lavanda/30 mt-0.5">JPG, PNG, WebP</span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
        />
      </div>
    </div>
  );
}
