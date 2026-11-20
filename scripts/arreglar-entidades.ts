/**
 * Corrección puntual: las notas guardadas antes de que el parser decodificara
 * entidades HTML conservan cosas como "Here&#x2019;s" en el titular. Se repasan
 * una vez; las nuevas ya entran limpias.
 *   npx tsx --env-file=.env scripts/arreglar-entidades.ts
 */
import { prisma } from "@/lib/prisma";
import { decodeEntities } from "@/lib/rss";

async function main() {
  const filas = await prisma.article.findMany({
    where: { OR: [{ title: { contains: "&" } }, { summary: { contains: "&" } }] },
    select: { id: true, title: true, summary: true },
  });

  let tocadas = 0;
  for (const f of filas) {
    const title = decodeEntities(f.title);
    const summary = decodeEntities(f.summary);
    if (title === f.title && summary === f.summary) continue;
    await prisma.article.update({ where: { id: f.id }, data: { title, summary } });
    tocadas++;
  }
  console.log(`revisadas ${filas.length} · corregidas ${tocadas}`);
}

main().then(() => process.exit(0));
