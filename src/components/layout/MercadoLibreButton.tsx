"use client";

import { motion } from "framer-motion";

const ML_URL = "https://www.mercadolibre.com.ar/pagina/sendero3d";

export default function MercadoLibreButton() {
  return (
    <motion.a
      href={ML_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Ver nuestra tienda en Mercado Libre"
      title="Ver en Mercado Libre"
      className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full overflow-hidden shadow-lg shadow-[#FFE600]/30 ring-1 ring-black/5 bg-[#FFE600]"
      animate={{
        y: [0, -6, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        repeatType: "loop",
        ease: "easeInOut",
        delay: 0.4,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/mercadolibre.png"
        alt="Mercado Libre"
        className="w-full h-full object-cover"
        draggable={false}
      />
    </motion.a>
  );
}
