import { FEEDS, type FeedSource } from "@/lib/feeds";
import { parseFeed, type ArticleInput } from "@/lib/rss";
import { dedupe, titleKey, withinWindow, WINDOW_DAYS } from "@/lib/normalize";
import { prisma } from "@/lib/prisma";

const FETCH_TIMEOUT_MS = 12_000;

// Varios medios responden 403 a un cliente sin User-Agent de navegador.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) NewsReader/1.0";

export type FeedResult = {
  source: FeedSource;
  ok: boolean;
  count: number;
  error?: string;
};

async function fetchFeed(source: FeedSource): Promise<string | null> {
  try {
    const response = await fetch(source.url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Lee las 15 fuentes en paralelo y devuelve la lista ya limpia: ordenada de más
 * nueva a más vieja, sin repetidos y recortada a la ventana de 7 días. No toca la
 * base de datos a propósito, para poder probar la ingesta sin credenciales.
 */
export async function collectArticles(
  feeds: FeedSource[] = FEEDS,
  now: Date = new Date(),
): Promise<{ articles: ArticleInput[]; results: FeedResult[] }> {
  const settled = await Promise.all(
    feeds.map(async (source): Promise<{ result: FeedResult; articles: ArticleInput[] }> => {
      const xml = await fetchFeed(source);
      if (xml === null) {
        return { result: { source, ok: false, count: 0, error: "no se pudo descargar" }, articles: [] };
      }
      const articles = parseFeed(xml, source);
      return { result: { source, ok: true, count: articles.length }, articles };
    }),
  );

  const all = settled.flatMap((s) => s.articles);

  // El orden importa antes de deduplicar: dedupe conserva la primera aparición, así
  // que ordenar de más nueva a más vieja deja la versión más reciente de cada nota.
  all.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  return {
    articles: withinWindow(dedupe(all), now),
    results: settled.map((s) => s.result),
  };
}

export type IngestReport = {
  fetched: number;
  inserted: number;
  purged: number;
  results: FeedResult[];
};

/** Ingesta completa: lee los feeds, guarda lo nuevo y borra lo que salió de la ventana. */
export async function ingestAll(now: Date = new Date()): Promise<IngestReport> {
  const { articles, results } = await collectArticles(FEEDS, now);

  // Un titular que ya está guardado bajo OTRA url no debe entrar de nuevo. El
  // choque por url lo resuelve el índice único; este filtro cubre el otro criterio.
  const keys = articles.map((a) => titleKey(a.title));
  const existing = await prisma.article.findMany({
    where: { titleKey: { in: keys } },
    select: { titleKey: true },
  });
  const known = new Set(existing.map((e) => e.titleKey));

  const nuevos = articles.filter((a) => !known.has(titleKey(a.title)));

  const { count: inserted } = await prisma.article.createMany({
    data: nuevos.map((a) => ({
      url: a.url,
      titleKey: titleKey(a.title),
      title: a.title,
      summary: a.summary,
      sourceId: a.sourceId,
      sourceName: a.sourceName,
      category: a.category,
      region: a.region,
      lang: a.lang,
      publishedAt: a.publishedAt,
    })),
    skipDuplicates: true,
  });

  const cutoff = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const { count: purged } = await prisma.article.deleteMany({
    where: { publishedAt: { lt: cutoff } },
  });

  return { fetched: articles.length, inserted, purged, results };
}
