"use client";

import { useEffect } from "react";
import { pulso } from "@/lib/pulso";

/**
 * Anota qué se buscó y cuántos resultados dio (analítica propia). Las
 * búsquedas sin resultados son pedidos de productos que todavía no hay.
 */
export default function RegistrarBusqueda({ termino, resultados }: { termino: string; resultados: number }) {
  useEffect(() => {
    pulso({ tipo: "busqueda", termino, resultados });
  }, [termino, resultados]);

  return null;
}
