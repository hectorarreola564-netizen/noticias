/**
 * Diagnóstico: corre el filtro de importancia sobre las noticias reales de las
 * últimas horas y enseña qué historias habrían disparado un aviso.
 *   npx tsx --env-file=.env scripts/probar-importancia.ts
 */
import { agruparPorHecho, esImportante } from "@/lib/importancia";
import { prisma } from "@/lib/prisma";

async function main() {
  const desde = new Date(Date.now() - 12 * 60 * 60 * 1000);
  const notas = await prisma.article.findMany({
    where: { publishedAt: { gte: desde } },
    select: { id: true, title: true, sourceId: true, sourceName: true, category: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  const historias = agruparPorHecho(notas);
  const importantes = historias.filter(esImportante);

  console.log(`notas en 12 h: ${notas.length}`);
  console.log(`historias distintas: ${historias.length}`);
  console.log(`calificarían para aviso: ${importantes.length}\n`);

  for (const h of importantes.sort((a, b) => b.fuentes.length - a.fuentes.length).slice(0, 10)) {
    console.log(`[${h.fuentes.length} medios${h.urgente ? ", urgente" : ""}] ${h.titular}`);
    console.log(`   ${h.fuentes.join(", ")}\n`);
  }
}

main().then(() => process.exit(0));
