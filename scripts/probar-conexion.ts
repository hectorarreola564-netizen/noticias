/**
 * Diagnóstico: prueba cada variante de cadena de conexión contra la base real.
 * Uso: npx tsx --env-file=.env scripts/probar-conexion.ts
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

async function probar(etiqueta: string, url: string | undefined) {
  if (!url) {
    console.log(`${etiqueta}: sin definir`);
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const n = await prisma.article.count();
    console.log(`${etiqueta}: OK — ${n} noticias`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`${etiqueta}: FALLA — ${msg.split("\n")[0].slice(0, 130)}`);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

async function main() {
  const pooled = process.env.DATABASE_URL_POOLED;
  await probar("5432 session    ", process.env.DATABASE_URL);
  await probar("6543 transaction", pooled);
  await probar("6543 +pgbouncer ", pooled ? `${pooled}?pgbouncer=true` : undefined);
}

main().then(() => process.exit(0));
