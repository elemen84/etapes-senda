/*
 * Service Worker — Senda de Camille (PWA Fase 1)
 * Precache de l'app shell + estratègies de servei.
 *
 * NO cacheja tiles ni vídeos. Els tiles es prepararan per etapa,
 * sota acció de l'usuari, en una fase posterior.
 */

const CACHE_VERSION = "camille-pwa-v3";
const APP_SHELL_CACHE = `${CACHE_VERSION}-app-shell`;
const HTML_TIMEOUT_MS = 3000;

/*
 * Recursos de l'app shell. URLs relatives a l'arrel (scope del SW).
 * Els GPX van codificats igual que fa encodeURI() a app.js perquè
 * el match de la caché coincideixi exactament amb la petició real.
 */
const APP_SHELL = [
  "index.html",
  "stage-1.html",
  "stage-2.html",
  "stage-3.html",
  "stage-4.html",
  "stage-5.html",
  "offline.html",
  "styles.css?v=audit-1",
  "app.js?v=audit-1",
  "home.js?v=audit-1",
  "register-sw.js?v=audit-1",
  "offline-tiles.js?v=phase2",
  "manifest.webmanifest",
  "assets/mountain-logo-transparent.png",
  "assets/hero-mountain.jpg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "assets/icon-maskable-512.png",
  "vendor/leaflet/leaflet.css",
  "vendor/leaflet/leaflet.js",
  "vendor/leaflet/images/marker-icon.png",
  "vendor/leaflet/images/marker-icon-2x.png",
  "vendor/leaflet/images/marker-shadow.png",
  "vendor/leaflet/marker-icon.png",
  "vendor/leaflet/marker-icon-2x.png",
  "vendor/leaflet/marker-shadow.png",
  "gpx/etapa-1-somport-arlet.gpx",
  "gpx/ETAPA%202%20ARLET-SELVA%20DE%20OZA%20TRK.gpx",
  "gpx/ETAPA%203%20OZA%20-%20GABARDITO%20TRK.gpx",
  "gpx/ETAPA%204%20GABARDITO%20-%20LIZARA%20TRK.gpx",
  "gpx/ETAPA%205%20LIZARA%20-%20SOMPORT%20TRK.gpx",
  "tiles/etapa-1/tiles-manifest.json",
  "tiles/etapa-2/tiles-manifest.json",
  "tiles/etapa-3/tiles-manifest.json",
  "tiles/etapa-4/tiles-manifest.json",
  "tiles/etapa-5/tiles-manifest.json",
];

/* INSTALL — precache resilient: un recurs caigut NO trenca la instal·lació. */
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_SHELL_CACHE);
      const results = await Promise.allSettled(
        APP_SHELL.map((url) => cache.add(new Request(url, { cache: "reload" }))),
      );

      const failed = [];
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          failed.push(APP_SHELL[index]);
          console.warn("[SW] No s'ha pogut precachejar:", APP_SHELL[index], result.reason);
        }
      });

      if (failed.length) {
        console.warn(
          `[SW] Precache incomplet: ${failed.length}/${APP_SHELL.length} recursos han fallat.`,
          failed,
        );
      } else {
        console.log(`[SW] Precache complet: ${APP_SHELL.length} recursos.`);
      }

      await self.skipWaiting();
    })(),
  );
});

/* ACTIVATE — neteja només caches d'app shell antics (mai els de tiles). */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.endsWith("-app-shell") && key !== APP_SHELL_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

/* FETCH — enrutament per tipus de recurs. */
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Peticions a altres orígens (p. ex. tiles online OpenTopoMap): no s'intercepten.
  if (url.origin !== self.location.origin) return;

  // Tiles: MAI es precachegen en aquesta fase. Cache-first passthrough:
  // serveix si ja existeix a alguna caché, si no va a xarxa, però no desa res.
  if (url.pathname.includes("/tiles/")) {
    // ignoreSearch: el sondeig d'app.js afegeix ?probe=<timestamp> a la URL del
    // tile. Sense ignoreSearch, caches.match no trobaria el tile cachejat (desat
    // sense query) i la capa offline no s'activaria mai. No cacheja res de nou.
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then((hit) => hit || fetch(request)),
    );
    return;
  }

  // Vídeos: mai es cachegen, gestió per defecte del navegador.
  if (url.pathname.includes("/videos/")) return;

  // Navegacions HTML: network-first amb timeout curt -> caché -> offline.html.
  if (request.mode === "navigate") {
    event.respondWith(networkFirstHtml(request));
    return;
  }

  // Estàtics: cache-first.
  event.respondWith(cacheFirst(request));
});

async function networkFirstHtml(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HTML_TIMEOUT_MS);

  try {
    const fresh = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (fresh && fresh.ok) {
      const cache = await caches.open(APP_SHELL_CACHE);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (error) {
    clearTimeout(timer);
    const cached = (await caches.match(request)) || (await caches.match("index.html"));
    if (cached) return cached;

    const offline = await caches.match("offline.html");
    if (offline) return offline;

    return new Response("Sense connexió.", {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(request) {
  const cached =
    (await caches.match(request)) || (await caches.match(request, { ignoreSearch: true }));
  if (cached) return cached;

  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      const cache = await caches.open(APP_SHELL_CACHE);
      cache.put(request, fresh.clone()).catch(() => {});
    }
    return fresh;
  } catch (error) {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}
