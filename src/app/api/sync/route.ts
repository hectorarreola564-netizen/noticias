import { ingestAll } from "@/lib/ingest";

// La ingesta lee 15 feeds en paralelo con 12s de tope cada uno; 60s es holgado y es
// el máximo del plan gratuito de Vercel.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * La dispara GitHub Actions cada 15 minutos (ver .github/workflows/sync.yml).
 * Protegida con CRON_SECRET para que no la pueda llamar cualquiera: sin eso, un
 * tercero podría forzar ingestas y quemar el plan gratuito.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET no está configurado" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "no autorizado" }, { status: 401 });
  }

  const started = Date.now();
  try {
    const report = await ingestAll();
    return Response.json({
      ok: true,
      ms: Date.now() - started,
      fetched: report.fetched,
      inserted: report.inserted,
      purged: report.purged,
      feeds: report.results.map((r) => ({ id: r.source.id, ok: r.ok, count: r.count })),
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
