"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Banner } from "@/types";

export default function PopupBanner({ banner }: { banner: Banner }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if already dismissed in this session
    const dismissed = sessionStorage.getItem(`popup-${banner.id}`);
    if (dismissed) return;

    // Show after 3 seconds
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, [banner.id]);

  function dismiss() {
    sessionStorage.setItem(`popup-${banner.id}`, "1");
    setShow(false);
  }

  if (!show) return null;

  const content = (
    <div className="relative">
      {banner.imagen_url && (
        <img
          src={banner.imagen_url}
          alt={banner.titulo || "Promoción"}
          className="w-full rounded-t-xl object-cover max-h-64"
        />
      )}
      <div className="p-6 text-center">
        {banner.titulo && (
          <h3 className="text-xl font-semibold text-texto mb-2">
            {banner.titulo}
          </h3>
        )}
        {banner.subtitulo && (
          <p className="text-sm text-lavanda-light mb-4">{banner.subtitulo}</p>
        )}
        {banner.link && (
          <Link
            href={banner.link}
            onClick={dismiss}
            className="inline-block px-6 py-2 bg-purpura hover:bg-purpura/80 text-niebla font-medium rounded-lg transition-colors"
          >
            Ver más
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="relative bg-navy-deep border border-linea rounded-xl max-w-md w-full overflow-hidden">
        <button
          onClick={dismiss}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-navy/80 text-niebla flex items-center justify-center hover:bg-navy transition-colors"
        >
          ✕
        </button>
        {content}
      </div>
    </div>
  );
}
