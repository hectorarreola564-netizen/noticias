/**
 * Decide qué merece una notificación.
 *
 * La señal principal es la CORROBORACIÓN: que varios medios independientes
 * publiquen sobre el mismo hecho en pocas horas. Es la única medida de
 * relevancia que se puede calcular gratis y sin modelos, y además es la que
 * usa cualquier redacción: si lo cubren todos, pasó algo.
 *
 * El refuerzo por palabras de urgencia existe solo para bajar el listón de 3 a
 * 2 medios: por sí solo es demasiado frágil (los medios abusan de "última
 * hora") y nunca basta para disparar un aviso.
 */

/** Palabras sin valor para identificar un hecho. */
const VACIAS = new Set([
  // español
  "para", "por", "con", "sin", "que", "del", "las", "los", "una", "uno", "unos", "unas",
  "este", "esta", "estos", "estas", "sus", "sobre", "entre", "desde", "hasta", "como",
  "más", "menos", "pero", "porque", "cuando", "donde", "quien", "cual", "ante", "tras",
  "ser", "son", "fue", "han", "hay", "está", "están", "tiene", "tienen", "hace", "hacen",
  "dice", "dijo", "tras", "año", "años", "día", "días", "mil", "millones", "nuevo", "nueva",
  // Verbos genéricos: aparecen en cualquier titular y, si se dejan, juntan
  // hechos sin relación solo porque ambos "anuncian" o "suben" algo.
  "sube", "baja", "gana", "pierde", "llega", "deja", "pide", "busca", "lanza",
  "abre", "cierra", "sigue", "supera", "anuncia", "revela", "asegura", "afirma",
  "advierte", "confirma", "reporta", "presenta", "destaca", "señala", "explica",
  // inglés
  "the", "and", "for", "with", "from", "that", "this", "these", "those", "has", "have",
  "will", "been", "are", "was", "were", "its", "their", "his", "her", "they", "them",
  "after", "before", "into", "over", "under", "about", "says", "said", "new", "than",
  "what", "when", "where", "which", "who", "how", "why", "could", "would", "should",
  "says", "report", "reports", "announces", "launches", "opens", "closes", "rises",
]);

/**
 * Marcadores de que un medio considera el hecho de ruptura. Bajan el umbral de
 * medios de 3 a 2; nunca disparan un aviso por sí solos.
 */
const URGENCIA = [
  "última hora", "ultima hora", "urgente", "en vivo", "breaking", "live updates",
  "muere", "murió", "fallece", "asesinan", "asesinato", "terremoto", "sismo",
  "explosión", "atentado", "renuncia", "dimite", "golpe de estado", "emergencia",
  "desplome", "se desploma", "plunges", "crashes", "resigns", "dies", "killed",
  "earthquake", "attack", "evacuación", "alerta",
];

/**
 * Umbrales calibrados contra datos reales (2026-11-20): con 441 notas en 12 h,
 * exigir 3 medios dejaba pasar 8 historias (~16 al día), demasiado para algo que
 * debe interrumpir. Con 4 quedan las 4 o 5 que de verdad cubrió todo el mundo.
 */
const MIN_FUENTES = 4;
const MIN_FUENTES_CON_URGENCIA = 3;
/** Dos titulares hablan del mismo hecho si comparten al menos estas palabras. */
const TOKENS_COMPARTIDOS = 2;

export type NotaParaEvaluar = {
  id: string;
  title: string;
  sourceId: string;
  sourceName: string;
  publishedAt: Date;
};

export type Historia = {
  /** Identificador estable del hecho, para no avisar dos veces de lo mismo. */
  clave: string;
  titular: string;
  fuentes: string[];
  notas: NotaParaEvaluar[];
  urgente: boolean;
};

/** Palabras con carga informativa de un titular, normalizadas sin acentos. */
export function tokensSignificativos(titulo: string): Set<string> {
  const limpio = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ");

  const tokens = limpio
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !VACIAS.has(t));

  return new Set(tokens);
}

function tieneUrgencia(titulo: string): boolean {
  const t = titulo.toLowerCase();
  return URGENCIA.some((m) => t.includes(m));
}

function compartidos(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const t of a) if (b.has(t)) n++;
  return n;
}

/**
 * Agrupa las notas que hablan del mismo hecho. Dos notas caen en el mismo grupo
 * si sus titulares comparten suficientes palabras con carga; la agrupación es
 * transitiva, así que una cadena de coincidencias une toda la cobertura.
 */
export function agruparPorHecho(notas: NotaParaEvaluar[]): Historia[] {
  const tokens = notas.map((n) => tokensSignificativos(n.title));
  const grupoDe = notas.map((_, i) => i);

  function raiz(i: number): number {
    while (grupoDe[i] !== i) i = grupoDe[i];
    return i;
  }

  for (let i = 0; i < notas.length; i++) {
    for (let j = i + 1; j < notas.length; j++) {
      if (compartidos(tokens[i], tokens[j]) >= TOKENS_COMPARTIDOS) {
        grupoDe[raiz(j)] = raiz(i);
      }
    }
  }

  const porRaiz = new Map<number, NotaParaEvaluar[]>();
  notas.forEach((n, i) => {
    const r = raiz(i);
    porRaiz.set(r, [...(porRaiz.get(r) ?? []), n]);
  });

  return [...porRaiz.values()].map((grupo) => {
    // El titular que representa la historia es el más antiguo: quien dio la
    // nota primero suele enunciarla de forma más directa que los seguimientos.
    const ordenadas = [...grupo].sort((a, b) => +a.publishedAt - +b.publishedAt);
    const fuentes = [...new Set(grupo.map((n) => n.sourceId))];
    const comunes = [...tokensSignificativos(ordenadas[0].title)].sort().slice(0, 4);

    return {
      clave: comunes.join("-"),
      titular: ordenadas[0].title,
      fuentes,
      notas: ordenadas,
      urgente: grupo.some((n) => tieneUrgencia(n.title)),
    };
  });
}

/** Una historia merece notificación si la corroboran suficientes medios. */
export function esImportante(h: Historia): boolean {
  const minimo = h.urgente ? MIN_FUENTES_CON_URGENCIA : MIN_FUENTES;
  return h.fuentes.length >= minimo;
}

/** La historia más corroborada de la lista, si alguna califica. */
export function historiaMasImportante(notas: NotaParaEvaluar[]): Historia | null {
  const candidatas = agruparPorHecho(notas).filter(esImportante);
  if (candidatas.length === 0) return null;

  return candidatas.sort((a, b) => {
    if (b.fuentes.length !== a.fuentes.length) return b.fuentes.length - a.fuentes.length;
    // A igualdad de cobertura, lo urgente primero y luego lo más reciente.
    if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
    return +b.notas[0].publishedAt - +a.notas[0].publishedAt;
  })[0];
}
