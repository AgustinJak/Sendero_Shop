"use client";

import { useState } from "react";
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
  const sorted = [...imagenes].sort((a, b) => a.orden - b.orden);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
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
      e.target.value = "";
    }
  }

  async function handleDelete(imagenId: string) {
    await fetch(`/api/admin/imagenes/${imagenId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="bg-navy rounded-xl border border-lavanda/10 p-4 space-y-4">
      <h2 className="text-sm font-semibold text-niebla">Imágenes</h2>

      <div className="grid grid-cols-2 gap-2">
        {sorted.map((img) => (
          <div key={img.id} className="relative group">
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
            <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white px-1 rounded">
              #{img.orden + 1}
            </span>
          </div>
        ))}
      </div>

      <label className="block">
        <span className="w-full py-2 border border-dashed border-lavanda/20 hover:border-purpura rounded-lg flex items-center justify-center text-sm text-lavanda/60 hover:text-lavanda-light cursor-pointer transition-colors">
          {uploading ? "Subiendo..." : "+ Agregar imágenes"}
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>
    </div>
  );
}
