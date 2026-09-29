"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { iniciarPulso, pulso } from "@/lib/pulso";

/**
 * Anota una página vista en cada cambio de página (analítica propia,
 * lib/pulso.ts). En /admin no manda nada.
 */
export default function Pulso() {
  const pathname = usePathname();

  useEffect(() => {
    iniciarPulso();
  }, []);

  useEffect(() => {
    pulso({ tipo: "vista" });
  }, [pathname]);

  return null;
}
