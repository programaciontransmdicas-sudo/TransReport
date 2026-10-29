const CACHE = "transreport-estaticos-__VERSION__";
const ARCHIVOS = __PRECACHE__;
const permitidos = new Set(ARCHIVOS);

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(
        ARCHIVOS.map((url) => new Request(url, { cache: "reload" })),
      );
    })(),
  );
  // New versions wait until the user explicitly chooses to update.
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      for (const nombre of await caches.keys()) {
        if (nombre.startsWith("transreport-estaticos-") && nombre !== CACHE) {
          await caches.delete(nombre);
        }
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (evento) => {
  if (evento.data?.tipo === "ACTUALIZAR") self.skipWaiting();
});

self.addEventListener("fetch", (evento) => {
  const { request } = evento;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (/^\/(api|health)(\/|$)/.test(url.pathname)) return;
  // Serve the matching shell and assets together, so an old open form is not
  // mixed with a new release. Other requests always go to the network.
  const ruta = request.mode === "navigate" ? "/index.html" : url.pathname;
  if (!permitidos.has(ruta)) return;
  evento.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(ruta)) || fetch(request);
    })(),
  );
});
