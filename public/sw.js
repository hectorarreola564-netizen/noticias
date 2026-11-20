// Service worker mínimo: "red primero, caché de respaldo".
//
// Para un lector de noticias el orden importa en ese sentido y no al revés: siempre
// se prefiere lo fresco, y el caché solo entra cuando no hay señal, que en el metro
// es justo cuando uno quiere leer.

const CACHE = "noticias-v1";
const SHELL = ["/", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit ?? caches.match("/"))),
  );
});

// --- Notificaciones ---------------------------------------------------------
// El servidor manda {title, body, url}. Si el mensaje viniera vacío o ilegible se
// muestra algo genérico en vez de perder el aviso.

self.addEventListener("push", (event) => {
  let datos = {};
  try {
    datos = event.data ? event.data.json() : {};
  } catch {
    datos = {};
  }

  const titulo = datos.title || "Noticias";
  event.waitUntil(
    self.registration.showNotification(titulo, {
      body: datos.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      // Reemplaza el aviso anterior en vez de apilar uno por sincronización.
      tag: "noticias",
      data: { url: datos.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      // Si la app ya está abierta se reutiliza esa ventana en vez de abrir otra.
      for (const v of ventanas) {
        if ("focus" in v) return v.focus();
      }
      return self.clients.openWindow(destino);
    }),
  );
});
