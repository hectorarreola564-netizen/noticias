import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lo deja puesto `next upgrade --agent=security`: marca que las correcciones
  // de seguridad de esta app las aplica un agente.
  experimental: {
    agentUpgrade: "security",
  },
  // Apagado a propósito, igual que en ParlayLab: la portada tiene que leer la base
  // en cada request para que "las noticias de hoy" sean de verdad las de hoy.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
