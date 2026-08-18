"use client";

import Link from "next/link";
import type { Banner } from "@/types";

export default function CatalogBanner({ banner }: { banner: Banner }) {
  const content = (
    <div className="relative rounded-xl overflow-hidden">
      {banner.imagen_url ? (
        <img
          src={banner.imagen_url}
          alt={banner.titulo || "Banner"}
          className="w-full h-32 sm:h-40 object-cover"
        />
      ) : (
        <div className="w-full h-32 sm:h-40 bg-gradient-to-r from-purpura/20 to-ambar/20" />
      )}
      <div className="absolute inset-0 bg-navy/40 flex items-center justify-center text-center px-4">
        <div>
          {banner.titulo && (
            <h3 className="display display-seccion text-texto drop-shadow">
              {banner.titulo}
            </h3>
          )}
          {banner.subtitulo && (
            <p className="text-sm text-lavanda-light mt-1 drop-shadow">
              {banner.subtitulo}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (banner.link) {
    return (
      <Link href={banner.link} className="block mb-6 hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return <div className="mb-6">{content}</div>;
}
