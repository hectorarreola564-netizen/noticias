import { XMLParser } from "fast-xml-parser";
import type { Category, FeedSource, Region } from "@/lib/feeds";

export type ArticleInput = {
  title: string;
  url: string;
  summary: string;
  sourceId: string;
  sourceName: string;
  category: Category;
  region: Region;
  lang: "es" | "en";
  publishedAt: Date;
  imageUrl: string | null;
};

/**
 * Parámetros de rastreo que los medios pegan al final del link del feed. Hay que
 * quitarlos antes de guardar: la misma nota llega con ?partner=rss desde el feed y
 * sin él desde otra sección, y si no se normaliza la URL el deduplicado no la ve.
 */
const TRACKING_PARAMS = /^(utm_|partner$|at_|ns_|ito$|cmpid$|smid$)/i;

function cleanUrl(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  let url: URL;
  try {
    url = new URL(String(raw).trim());
  } catch {
    return null;
  }
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) url.searchParams.delete(key);
  }
  url.hash = "";
  return url.toString().replace(/\?$/, "");
}

function cleanDate(raw: unknown): Date | null {
  if (raw === undefined || raw === null) return null;
  const date = new Date(String(raw).trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Algunos medios (Excélsior) publican el feed con el CDATA doble-escapado: lo que
 * llega es el texto literal "<![CDATA[...]]>" en vez del contenido. Hay que quitar
 * el envoltorio ANTES de limpiar HTML, porque si no la limpieza lo toma por una
 * etiqueta y se lleva el texto completo con él.
 */
/**
 * Los medios publican el titular con entidades HTML dentro del CDATA
 * ("Here&#x2019;s"), y como van dentro de CDATA el parser de XML no las toca:
 * llegan literales a la pantalla. Se decodifican las numéricas (decimales y
 * hexadecimales) y las cinco con nombre que aparecen en la práctica.
 */
const ENTIDADES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (completa, cuerpo: string) => {
    const b = cuerpo.toLowerCase();
    if (b.startsWith("#x")) {
      const n = Number.parseInt(b.slice(2), 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : completa;
    }
    if (b.startsWith("#")) {
      const n = Number.parseInt(b.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : completa;
    }
    return ENTIDADES[b] ?? completa;
  });
}

function unwrapCdata(value: string): string {
  const match = value.trim().match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return match ? match[1] : value;
}

/**
 * Los medios meten HTML dentro de <description>: párrafos, negritas y a veces una
 * foto. Aquí se queda solo el texto, porque la tarjeta del feed muestra dos líneas
 * y cualquier etiqueta se vería literal.
 */
function cleanSummary(raw: unknown): string {
  if (raw === undefined || raw === null) return "";
  return decodeEntities(
    unwrapCdata(String(raw).trim())
      .replace(/<\/(p|div|li|br|h[1-6])>/gi, " ")
      .replace(/<[^>]*>/g, ""),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Algunos medios publican en el mismo feed una entrada por día cuyo titular es solo
 * la fecha ("Martes, 17 de noviembre de 2026 (02:00 GMT)"). No es una noticia y en
 * el feed se ve como un error, así que se descarta.
 */
const TITULO_INDICE =
  /^(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\s*,?\s+\d{1,2}\s+de\s+\w+\s+de\s+\d{4}/i;

function cleanTitle(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const title = decodeEntities(unwrapCdata(String(raw).trim())).trim();
  if (title.length === 0) return null;
  if (TITULO_INDICE.test(title)) return null;
  return title;
}

/**
 * En RSS el link es el texto del nodo; en Atom es el atributo href de <link>, y
 * puede venir una lista de links (alternate, self, replies) de la que sirve el
 * alternate, o el primero si no está etiquetado.
 */
function linkOf(item: Record<string, any>): unknown {
  const link = item.link;
  if (typeof link === "string" || typeof link === "number") return link;

  const candidates = asArray(link).filter((l) => l && typeof l === "object");
  const alternate = candidates.find((l: any) => l["@_rel"] === "alternate") ?? candidates[0];
  return alternate?.["@_href"];
}

/**
 * La foto de la nota no viene en un campo estándar: cada medio usa una etiqueta
 * distinta del módulo Media RSS. Verificado en los feeds reales (2026-11-20):
 * Infobae, El Financiero y MarketWatch usan media:content; BBC usa
 * media:thumbnail; La Jornada no publica foto por nota, solo el logo del diario
 * a nivel de canal, que no sirve y no se toma.
 *
 * Se ignora cualquier adjunto que no sea imagen (los podcasts publican audio en
 * enclosure) y se pide https, porque una foto en http la bloquea el navegador
 * dentro de una página segura.
 */
function imageOf(item: Record<string, any>): string | null {
  const candidatos = [
    ...asArray(item["media:content"]),
    ...asArray(item["media:thumbnail"]),
    ...asArray(item.enclosure),
  ];

  for (const c of candidatos) {
    if (!c || typeof c !== "object") continue;
    const tipo = String(c["@_type"] ?? "");
    if (tipo && !tipo.startsWith("image/")) continue;
    const url = c["@_url"];
    if (typeof url !== "string") continue;
    const limpia = url.trim();
    if (limpia.startsWith("https://")) return limpia;
  }
  return null;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Un feed roto no debe tumbar la ingesta de los otros 14, así que aquí nada lanza:
 * lo que no se entiende se descarta en silencio y lo demás pasa. El conteo de lo
 * que se descartó se reporta en la ingesta, no aquí.
 */
export function parseFeed(xml: string, source: FeedSource): ArticleInput[] {
  let doc: Record<string, any>;
  try {
    doc = parser.parse(xml);
  } catch {
    return [];
  }

  // RSS 2.0 cuelga los items de rss.channel.item; Atom los llama entry y los cuelga
  // de feed. Se aceptan los dos porque la lista de fuentes puede crecer con
  // cualquiera de los dos formatos sin avisar.
  const items = [
    ...asArray(doc?.rss?.channel?.item),
    ...asArray(doc?.feed?.entry),
  ];
  const articles: ArticleInput[] = [];

  for (const item of items as Record<string, any>[]) {
    const title = cleanTitle(item.title);
    const url = cleanUrl(linkOf(item));
    const publishedAt = cleanDate(item.pubDate ?? item.updated ?? item.published);
    if (!title || !url || !publishedAt) continue;

    articles.push({
      title,
      url,
      summary: cleanSummary(item.description ?? item.summary ?? item.content),
      sourceId: source.id,
      sourceName: source.name,
      category: source.category,
      region: source.region,
      lang: source.lang,
      publishedAt,
      imageUrl: imageOf(item),
    });
  }

  return articles;
}
