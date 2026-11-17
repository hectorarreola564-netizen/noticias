// Las 15 fuentes del v1. Todas verificadas una por una con curl el 2026-11-16:
// responden 200, devuelven RSS 2.0 válido y traen items. La lista de reserva al
// final son feeds que también verifiqué y funcionan, pero que dejé fuera para no
// pasar de 15 (acuerdo del grilling: pocas fuentes, revisables a ojo).
//
// La categoría NO se adivina del contenido: la hereda del feed, porque los medios
// publican un RSS por sección. Ver docs/agents/ y .scratch/news-aggregator/spec.md.

export type Category = "politica" | "mercados" | "sucesos" | "internacional" | "general";
export type Region = "mx" | "us" | "global";

export type FeedSource = {
  /** Identificador estable; es la llave con la que se guarda en la base. */
  id: string;
  /** Nombre que ve el usuario en la tarjeta de la noticia. */
  name: string;
  url: string;
  category: Category;
  region: Region;
  lang: "es" | "en";
};

export const FEEDS: FeedSource[] = [
  // --- México ---
  { id: "jornada-politica", name: "La Jornada · Política", url: "https://www.jornada.com.mx/rss/politica.xml", category: "politica", region: "mx", lang: "es" },
  { id: "jornada-estados", name: "La Jornada · Estados", url: "https://www.jornada.com.mx/rss/estados.xml", category: "sucesos", region: "mx", lang: "es" },
  { id: "excelsior-nacional", name: "Excélsior · Nacional", url: "https://www.excelsior.com.mx/rss/nacional", category: "politica", region: "mx", lang: "es" },
  // Sección México, NO el feed general: el general de Infobae es panregional y llega
  // lleno de deportes y espectáculos. Su sección "política" tampoco sirve: Infobae es
  // argentino y ahí publica política de Argentina.
  { id: "infobae-mexico", name: "Infobae México", url: "https://www.infobae.com/arc/outboundfeeds/rss/category/mexico/?outputType=xml", category: "general", region: "mx", lang: "es" },
  { id: "elpais-mexico", name: "El País · México", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/mexico/portada", category: "general", region: "mx", lang: "es" },
  { id: "elfinanciero", name: "El Financiero", url: "https://www.elfinanciero.com.mx/rss/", category: "mercados", region: "mx", lang: "es" },
  { id: "eleconomista", name: "El Economista", url: "https://www.eleconomista.com.mx/rss/ultimas-noticias", category: "mercados", region: "mx", lang: "es" },

  // --- Estados Unidos: política y gobierno ---
  { id: "npr-politics", name: "NPR · Politics", url: "https://feeds.npr.org/1014/rss.xml", category: "politica", region: "us", lang: "en" },
  { id: "thehill", name: "The Hill", url: "https://thehill.com/news/feed/", category: "politica", region: "us", lang: "en" },
  { id: "nyt-politics", name: "NYT · Politics", url: "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml", category: "politica", region: "us", lang: "en" },

  // --- Internacional ---
  { id: "bbc-mundo", name: "BBC Mundo", url: "https://feeds.bbci.co.uk/mundo/rss.xml", category: "internacional", region: "global", lang: "es" },
  { id: "elpais-internacional", name: "El País · Internacional", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/internacional/portada", category: "internacional", region: "global", lang: "es" },
  { id: "aljazeera", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "internacional", region: "global", lang: "en" },

  // --- Mercados globales ---
  { id: "cnbc-markets", name: "CNBC · Markets", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664", category: "mercados", region: "global", lang: "en" },
  { id: "marketwatch", name: "MarketWatch", url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", category: "mercados", region: "global", lang: "en" },
];

/**
 * Feeds verificados que funcionan pero quedaron fuera del v1 para no pasar de 15.
 * Mover de aquí a FEEDS es todo lo que hace falta para agregarlos.
 */
export const FEEDS_RESERVA: FeedSource[] = [
  { id: "guardian-us", name: "The Guardian · US", url: "https://www.theguardian.com/us-news/rss", category: "politica", region: "us", lang: "en" },
  { id: "dw-es", name: "Deutsche Welle", url: "https://rss.dw.com/rdf/rss-sp-all", category: "internacional", region: "global", lang: "es" },
  { id: "jornada-mundo", name: "La Jornada · Mundo", url: "https://www.jornada.com.mx/rss/mundo.xml", category: "internacional", region: "mx", lang: "es" },
  { id: "jornada-economia", name: "La Jornada · Economía", url: "https://www.jornada.com.mx/rss/economia.xml", category: "mercados", region: "mx", lang: "es" },
  { id: "investing-mx", name: "Investing México", url: "https://mx.investing.com/rss/news.rss", category: "mercados", region: "mx", lang: "es" },
  { id: "ft-markets", name: "Financial Times · Markets", url: "https://www.ft.com/markets?format=rss", category: "mercados", region: "global", lang: "en" },
  { id: "bbc-us", name: "BBC · US & Canada", url: "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml", category: "politica", region: "us", lang: "en" },
  { id: "bbc-world", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "internacional", region: "global", lang: "en" },
  { id: "expansion", name: "Expansión", url: "https://expansion.mx/rss", category: "mercados", region: "mx", lang: "es" },
  { id: "elpais-economia", name: "El País · Economía", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/economia/portada", category: "mercados", region: "global", lang: "es" },
];
