/**
 * Corre la ingesta real contra las 15 fuentes y reporta qué trajo cada una. No toca
 * la base de datos, así que sirve para verificar el parseo sin credenciales:
 *   npx tsx scripts/check-feeds.ts
 */
import { collectArticles } from "@/lib/ingest";

async function main() {
  const { articles, results } = await collectArticles();

  for (const r of results) {
    const estado = r.ok ? `${String(r.count).padStart(3)} items` : `FALLÓ (${r.error})`;
    console.log(`${r.source.id.padEnd(18)} ${r.source.category.padEnd(14)} ${estado}`);
  }

  const porCategoria = articles.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\nTras deduplicar y recortar a 7 días: ${articles.length} notas`);
  console.log("Por categoría:", porCategoria);
  console.log("\nMás recientes:");
  for (const a of articles.slice(0, 5)) {
    console.log(`  [${a.sourceName}] ${a.title.slice(0, 70)}`);
  }
}

main();
