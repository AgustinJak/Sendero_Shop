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

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        // Check for updates periodically
        reg.update();
      })
      .catch(() => {});
  }, []);

  return null;
}
