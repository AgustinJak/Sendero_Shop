"use client";

import { useState, useEffect, useCallback } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!VAPID_PUBLIC_KEY) return;

    const dismissed = localStorage.getItem("push-dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 7 * 24 * 60 * 60 * 1000) return;
    }

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setTimeout(() => setShow(true), 5000);
      }
    });
  }, []);

  const handleSubscribe = useCallback(async () => {
    setSubscribing(true);
    setError(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setError("Las notificaciones están bloqueadas. Hacé clic en el candado de la barra de direcciones y permitilas.");
        setSubscribing(false);
        return;
      }
      if (permission !== "granted") {
        setShow(false);
        localStorage.setItem("push-dismissed", String(Date.now()));
        setSubscribing(false);
        return;
      }

      const reg = await navigator.serviceWorker.ready;

      let subscription: PushSubscription;
      try {
        const subscribePromise = reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 10000)
        );
        subscription = await Promise.race([subscribePromise, timeoutPromise]);
      } catch (pushErr) {
        console.error("pushManager.subscribe failed:", pushErr);
        const msg = pushErr instanceof Error && pushErr.message === "timeout"
          ? "Tardó demasiado. Recargá la página e intentá de nuevo."
          : "Error al suscribir. Recargá la página e intentá de nuevo.";
        setError(msg);
        setSubscribing(false);
        return;
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Subscribe API error:", data);
        setError("Error al guardar la suscripción.");
        setSubscribing(false);
        return;
      }

      setShow(false);
    } catch (err) {
      console.error("Push subscription error:", err);
      setError("Error inesperado. Recargá la página e intentá de nuevo.");
      setSubscribing(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem("push-dismissed", String(Date.now()));
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-in slide-in-from-bottom-4">
      <div className="bg-navy border border-lavanda/20 rounded-xl p-4 shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-purpura/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-ambar" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-niebla">Activar notificaciones</p>
            <p className="text-xs text-lavanda/60 mt-0.5">
              Enterate de ofertas, nuevos productos y el estado de tu pedido.
            </p>
            {error && (
              <p className="text-xs text-red-400 mt-1">{error}</p>
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSubscribe}
                disabled={subscribing}
                className="px-3 py-1.5 bg-purpura hover:bg-purpura/80 text-niebla text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {subscribing ? "Activando..." : error ? "Reintentar" : "Activar"}
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs text-lavanda/60 hover:text-lavanda-light transition-colors"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
