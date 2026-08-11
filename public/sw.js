const CACHE_NAME = "sendero-v3";
const STATIC_ASSETS = [
  "/",
  "/catalogo",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/assets/loading-knight.gif",
];

/**
 * Rutas que nunca se guardan en caché: tienen datos del cliente (pedido,
 * dirección, DNI) o del admin, y quedarían en el disco del dispositivo
 * pudiendo servirse más tarde a quien lo use.
 */
const RUTAS_PRIVADAS = [
  "/checkout",
  "/pedido",
  "/mi-pedido",
  "/admin",
  "/api/",
];

function esPrivada(pathname) {
  return RUTAS_PRIVADAS.some(
    (p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`)
  );
}

/** Solo vale guardar respuestas propias y exitosas (no 404, 500 ni opacas). */
function esCacheable(response) {
  return response && response.ok && response.type === "basic";
}

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for pages, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and external requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Service worker itself y rutas con datos personales: siempre a la red,
  // sin escribir ni leer caché.
  if (url.pathname === "/sw.js" || esPrivada(url.pathname)) return;

  // Static assets (images, fonts, CSS, JS): cache-first
  if (
    url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico|woff2?|css|js)$/) ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/_next/static/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (esCacheable(response)) {
              const clone = response.clone();
              caches
                .open(CACHE_NAME)
                .then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Pages: network-first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (esCacheable(response)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ============================================
// Push Notifications
// ============================================

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Sendero Shop", body: event.data.text() };
  }

  const options = {
    body: data.body || "",
    icon: data.icon || "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    image: data.image || undefined,
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
    tag: data.tag || "sendero-notification",
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Sendero Shop", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing tab if open
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Otherwise open new tab
        return clients.openWindow(url);
      })
  );
});
