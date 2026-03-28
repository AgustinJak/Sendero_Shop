import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sendero Shop — Figuras y Accesorios 3D",
    short_name: "Sendero Shop",
    description:
      "Figuras, katanas y accesorios impresos en 3D inspirados en anime, cine y videojuegos.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e1a",
    theme_color: "#6b21a8",
    orientation: "portrait-primary",
    categories: ["shopping", "entertainment"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
