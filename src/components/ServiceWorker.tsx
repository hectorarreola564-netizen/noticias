"use client";

import { useEffect } from "react";

/** Registra el service worker; sin esto la app no se instala ni funciona sin red. */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Si el registro falla la app sigue funcionando en línea; no vale la pena
      // molestar al usuario con un error que no puede accionar.
    });
  }, []);

  return null;
}
