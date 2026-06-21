/*
 * offline-tiles.js — Preparació offline per etapa (Fase 2B).
 *
 * Mòdul aïllat: NO toca app.js ni la lògica del mapa (online/offline,
 * GPX, perfil d'altitud, mesura de tram). Sota acció de l'usuari,
 * descarrega NOMÉS els tiles de l'etapa actual (tiles/etapa-X/) cap a
 * una caché dedicada `camille-tiles-etapa-X`. Mai descarrega tots els
 * tiles de cop ni cacheja vídeos. El Service Worker ja serveix aquests
 * tiles offline via caches.match(), sense canvis a la seva lògica.
 */
(function () {
  "use strict";

  const shell = document.querySelector("#appShell");
  const prep = document.querySelector("#offlinePrep");
  const button = document.querySelector("#prepareOfflineButton");
  const text = document.querySelector("#offlinePrepText");
  const barFill = document.querySelector("#offlineBarFill");
  if (!shell || !prep || !button || !text) return;

  const stageId = shell.dataset.stage;
  if (!stageId) return;

  const manifestUrl = `tiles/etapa-${stageId}/tiles-manifest.json`;
  const cacheName = `camille-tiles-etapa-${stageId}`;
  const expectedKey = `camille-stage-${stageId}-offline-tiles`;
  const CONCURRENCY = 6;

  let busy = false;

  if (!("caches" in window)) {
    render("unsupported");
    return;
  }

  button.addEventListener("click", () => {
    if (busy || prep.dataset.state === "ready") return;
    prepare();
  });

  refreshStatus();

  function render(state, label) {
    prep.dataset.state = state;
    const labels = {
      idle: "Preparar offline",
      preparing: label || "Preparant…",
      ready: "Offline llest ✓",
      partial: label || "Reprendre baixada",
      error: "Reintentar",
      unsupported: "Offline no disponible",
    };
    text.textContent = labels[state] || labels.idle;
    button.disabled = state === "preparing" || state === "ready" || state === "unsupported";
  }

  function renderProgress(done, total) {
    const pct = total ? Math.round((done / total) * 100) : 0;
    if (barFill) barFill.style.width = `${pct}%`;
    render("preparing", `Preparant… ${pct}%`);
  }

  async function refreshStatus() {
    try {
      const expected = Number(localStorage.getItem(expectedKey)) || 0;
      const cache = await caches.open(cacheName);
      const have = (await cache.keys()).length;
      if (expected > 0 && have >= expected) {
        render("ready");
      } else if (have > 0) {
        const ref = Math.max(expected, have);
        render("partial", `Reprendre (${Math.round((have / ref) * 100)}%)`);
      } else {
        render("idle");
      }
    } catch (error) {
      render("idle");
    }
  }

  async function prepare() {
    busy = true;
    renderProgress(0, 1);

    try {
      // Emmagatzematge persistent (best-effort): evita expulsió del navegador.
      if (navigator.storage && navigator.storage.persist) {
        try {
          await navigator.storage.persist();
        } catch (error) {
          /* ignorat */
        }
      }

      const response = await fetch(manifestUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`manifest ${response.status}`);
      const manifest = await response.json();
      const urls = Array.isArray(manifest) ? manifest : manifest.tiles || [];
      const total = urls.length;
      const expected = (manifest && manifest.count) || total;
      if (!total) throw new Error("manifest buit");

      const cache = await caches.open(cacheName);
      let done = 0;
      let cursor = 0;
      let lastPct = -1;

      async function worker() {
        while (cursor < total) {
          const url = urls[cursor++];
          try {
            const existing = await cache.match(url);
            if (!existing) {
              const tile = await fetch(url, { cache: "no-store" });
              if (tile && tile.ok) await cache.put(url, tile.clone());
            }
          } catch (error) {
            /* tile individual fallit: continuem; es validarà al final */
          }
          done++;
          const pct = Math.round((done / total) * 100);
          if (pct !== lastPct) {
            lastPct = pct;
            renderProgress(done, total);
          }
        }
      }

      await Promise.all(Array.from({ length: CONCURRENCY }, worker));

      // Verificació: la caché ha de contenir els tiles esperats.
      const have = (await cache.keys()).length;
      if (have >= expected) {
        localStorage.setItem(expectedKey, String(expected));
        render("ready");
      } else {
        render("partial", `Reprendre (${Math.round((have / expected) * 100)}%)`);
      }
    } catch (error) {
      console.warn("[offline-tiles] Error preparant l'etapa:", error);
      render("error");
    } finally {
      busy = false;
    }
  }
})();
