/**
 * Corre la ingesta completa contra la base de datos desde tu máquina:
 *   npx tsx --env-file=.env scripts/sync.ts
 *
 * Para probar el parseo SIN base de datos, usa scripts/check-feeds.ts.
 */
import { ingestAll } from "@/lib/ingest";

async function main() {
  const report = await ingestAll();

  for (const r of report.results) {
    console.log(`${r.source.id.padEnd(18)} ${r.ok ? `${r.count} items` : `FALLÓ: ${r.error}`}`);
  }

  console.log(`\nEn ventana: ${report.fetched} · Nuevas: ${report.inserted} · Purgadas: ${report.purged}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
