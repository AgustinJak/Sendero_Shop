"use client";

import { useEffect } from "react";

/** En local el SW sirve bundles viejos y hace perder tiempo depurando fantasmas. */
function esDesarrollo() {
  const { hostname } = window.location;
  return hostname === "localhost" || hostname === "127.0.0.1";
}

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (esDesarrollo()) {
      // Además de no registrarlo, se limpia el que haya quedado de antes.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      return;
    }

    // Se registra con la página ya cargada y el navegador libre. Al instalarse
    // precarga la home, el catálogo e íconos (~250 KB): registrado apenas
    // hidrataba React, eso competía con el banner por el ancho de banda.
    //
    // Sin reg.update() después de registrar: disparaba una actualización
    // mientras el SW todavía se instalaba, y fallaba con "Failed to update a
    // ServiceWorker" (el error de consola que marcaba PageSpeed). Con
    // updateViaCache "none" el navegador ya busca versiones nuevas solo.
    const registrar = () =>
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {});
    const cuandoEsteLibre = () =>
      "requestIdleCallback" in window ? window.requestIdleCallback(registrar) : setTimeout(registrar, 1000);

    if (document.readyState === "complete") cuandoEsteLibre();
    else window.addEventListener("load", cuandoEsteLibre, { once: true });
  }, []);

  return null;
}
