import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Prisma 7 ya no acepta `url` dentro del bloque datasource del schema: la
 * conexión que usan los comandos de la CLI (migrate, studio) se declara aquí.
 * En runtime no interviene — src/lib/prisma.ts conecta con el adaptador
 * PrismaPg y su propia cadena.
 *
 * Para migrar hace falta la cadena del *session pooler* (puerto 5432): el
 * transaction pooler (6543) no soporta los comandos DDL que crean tablas.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
