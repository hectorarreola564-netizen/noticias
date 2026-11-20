"use client";

import { useEffect, useState } from "react";

type Estado = "cargando" | "no-soportado" | "requiere-instalar" | "apagado" | "encendido" | "bloqueado";

/** La llave pública VAPID viaja en base64url y PushManager la quiere en bytes. */
function base64UrlABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const normal = (base64 + relleno).replace(/-/g, "+").replace(/_/g, "/");
  const binario = atob(normal);
  // Se reserva el ArrayBuffer explícitamente: PushManager exige un BufferSource
  // respaldado por ArrayBuffer, y Uint8Array.from deja el tipo más laxo.
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

/**
 * En iPhone, Web Push solo existe si la app está instalada en la pantalla de
 * inicio: desde una pestaña de Safari la API no aparece. Por eso el botón
 * distingue "este navegador no puede" de "instálala primero", que es lo que de
 * verdad le va a pasar al usuario.
 */
function esIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function instalada(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // Safari en iOS expone esto en lugar de display-mode.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function PushButton({ vapidKey }: { vapidKey: string }) {
  const [estado, setEstado] = useState<Estado>("cargando");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setEstado(esIOS() && !instalada() ? "requiere-instalar" : "no-soportado");
      return;
    }
    if (Notification.permission === "denied") {
      setEstado("bloqueado");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEstado(sub ? "encendido" : "apagado"))
      .catch(() => setEstado("apagado"));
  }, []);

  async function encender() {
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado(permiso === "denied" ? "bloqueado" : "apagado");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlABytes(vapidKey),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setEstado("encendido");
    } catch {
      setEstado("apagado");
    }
  }

  async function apagar() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      });
      await sub.unsubscribe();
    }
    setEstado("apagado");
  }

  if (estado === "cargando" || estado === "no-soportado") return null;

  const base =
    "rounded-full border px-3 py-1 text-xs font-medium transition-colors active:opacity-60";

  if (estado === "requiere-instalar") {
    return (
      <span className={`${base} border-(--color-borde) text-(--color-apagado)`}>
        Instálala para recibir avisos
      </span>
    );
  }
  if (estado === "bloqueado") {
    return (
      <span className={`${base} border-(--color-borde) text-(--color-apagado)`}>
        Avisos bloqueados
      </span>
    );
  }
  if (estado === "encendido") {
    return (
      <button onClick={apagar} className={`${base} border-(--color-acento) text-(--color-acento)`}>
        Avisos activados
      </button>
    );
  }
  return (
    <button onClick={encender} className={`${base} border-(--color-borde) text-(--color-apagado)`}>
      Activar avisos
    </button>
  );
}
