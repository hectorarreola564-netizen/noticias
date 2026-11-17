import type { Metadata, Viewport } from "next";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Noticias",
  description: "Política, mercados, sucesos e internacional de hoy, en un solo feed.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Noticias",
    // "default" deja la barra de estado legible sobre el fondo oscuro de la app.
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d10",
  width: "device-width",
  initialScale: 1,
  // Sin esto, iOS hace zoom al tocar dos veces y la app se siente como una página.
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="mx-auto max-w-2xl px-4 pb-16">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
