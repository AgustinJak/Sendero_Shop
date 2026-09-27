"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { paginaVistaMeta } from "@/lib/meta-pixel";

/**
 * Manda un PageView al píxel de Meta en cada cambio de página. La primera
 * carga del píxel y el resto de la lógica viven en lib/meta-pixel.ts.
 */
export default function MetaPixel() {
  const pathname = usePathname();

  useEffect(() => {
    paginaVistaMeta(pathname);
  }, [pathname]);

  return null;
}
