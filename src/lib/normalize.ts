import type { ArticleInput } from "@/lib/rss";

/**
 * Llave con la que dos titulares se consideran el mismo: sin mayúsculas y con los
 * espacios colapsados. Es el deduplicado "barato" que acordamos para el v1; agrupar
 * coberturas distintas del mismo hecho (titulares diferentes) queda para después.
 */
export function titleKey(title: string): string {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Quita repetidos por URL y por titular, conservando la PRIMERA aparición. El orden
 * de entrada es por tanto una decisión de quien llama: si la lista llega ordenada de
 * más nueva a más vieja, se queda la versión más reciente.
 */
export function dedupe(articles: ArticleInput[]): ArticleInput[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const result: ArticleInput[] = [];

  for (const article of articles) {
    const key = titleKey(article.title);
    if (seenUrls.has(article.url) || seenTitles.has(key)) continue;
    seenUrls.add(article.url);
    seenTitles.add(key);
    result.push(article);
  }

  return result;
}

/** Días que la app guarda hacia atrás. Acuerdo del grilling: una semana. */
export const WINDOW_DAYS = 7;

/**
 * Margen de adelanto que se tolera. Algunos feeds publican con la fecha corrida
 * unas horas por zona horaria mal puesta; descartarlas sería perder notas buenas,
 * pero aceptar cualquier fecha futura deja una nota clavada arriba del feed para
 * siempre, porque el orden es cronológico.
 */
const FUTURE_TOLERANCE_HOURS = 6;

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function withinWindow(articles: ArticleInput[], now: Date): ArticleInput[] {
  const oldest = now.getTime() - WINDOW_DAYS * DAY;
  const newest = now.getTime() + FUTURE_TOLERANCE_HOURS * HOUR;

  return articles.filter((article) => {
    const at = article.publishedAt.getTime();
    return at >= oldest && at <= newest;
  });
}

/**
 * Reparte el feed para que ningún medio acapare la parte alta.
 *
 * Hace falta porque las fuentes publican a ritmos muy distintos: Infobae saca ~100
 * notas al día y La Jornada ~40 en total, así que en orden estrictamente cronológico
 * la primera pantalla era toda del mismo medio. Se respeta el orden de entrada todo
 * lo posible: solo se empuja hacia abajo lo que exceda `maxSeguidas` consecutivas.
 */
export function spreadSources<T extends { sourceId: string }>(
  articles: T[],
  maxSeguidas = 2,
): T[] {
  const pendientes = [...articles];
  const result: T[] = [];
  let ultimoSource: string | null = null;
  let seguidas = 0;

  while (pendientes.length > 0) {
    // Si el medio de arriba ya llenó su cuota, se busca el siguiente de otro medio;
    // si no hay ninguno, se acepta el repetido en vez de dejar notas fuera.
    let i = 0;
    if (seguidas >= maxSeguidas) {
      const otro = pendientes.findIndex((a) => a.sourceId !== ultimoSource);
      if (otro !== -1) i = otro;
    }

    const [elegido] = pendientes.splice(i, 1);
    seguidas = elegido.sourceId === ultimoSource ? seguidas + 1 : 1;
    ultimoSource = elegido.sourceId;
    result.push(elegido);
  }

  return result;
}
