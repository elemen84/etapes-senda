/*
 * Registre del Service Worker — Senda de Camille.
 * Carregat per totes les pàgines. Es registra després de "load"
 * per no competir amb el render inicial. Requereix context segur
 * (HTTPS o localhost); amb file:// no funcionarà.
 */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              console.log("[SW] Nova versió disponible. Recarrega per actualitzar.");
            }
          });
        });
      })
      .catch((error) => {
        console.warn("[SW] Registre fallit:", error);
      });
  });
}
