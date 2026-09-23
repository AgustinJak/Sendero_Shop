const ML_URL = "https://www.mercadolibre.com.ar/pagina/sendero3d";

/**
 * El vaivén es CSS (`animate-flotar`) y no framer-motion: este botón está en
 * el layout, así que la librería viajaba en todas las páginas solo por esto.
 *
 * El ícono es un WebP de 168 px (3× los 56 del botón) recortado al cuadrado
 * central, que es lo que se veía con `object-cover`. El PNG anterior medía
 * 1232×758 y pesaba 189 KB: era el archivo más pesado de casi cualquier página.
 */
export default function MercadoLibreButton() {
  return (
    <a
      href={ML_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Ver nuestra tienda en Mercado Libre"
      title="Ver en Mercado Libre"
      className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full overflow-hidden shadow-lg shadow-[#FFE600]/30 ring-1 ring-black/5 bg-[#FFE600] animate-flotar [animation-delay:0.4s] motion-reduce:animate-none"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/mercadolibre.webp"
        alt="Mercado Libre"
        width={56}
        height={56}
        className="w-full h-full object-cover"
        draggable={false}
        loading="lazy"
        decoding="async"
      />
    </a>
  );
}
