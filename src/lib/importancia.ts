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
  /** Sección del medio de la que viene (ver src/lib/feeds.ts). */
  category: string;
  publishedAt: Date;
};

/**
 * Una nota publicada en la sección de política, mercados o internacional viene
 * de una mesa que cubre temas serios; las de categoría "general" vienen de la
 * portada del medio, donde conviven el gabinete y el casco de un piloto.
 *
 * Exigir que al menos un medio la haya publicado desde una sección seria separa
 * "lo cubren todos porque importa" de "lo cubren todos porque da clics", sin
 * necesidad de clasificar el contenido ni de pagar un modelo.
 */
const SECCIONES_SERIAS = new Set(["politica", "mercados", "internacional"]);

export type Historia = {
  /** Identificador estable del hecho, para no avisar dos veces de lo mismo. */
  clave: string;
  titular: string;
  fuentes: string[];
  notas: NotaParaEvaluar[];
  urgente: boolean;
  /** Si alguna de las coberturas vino de una sección seria. */
  respaldoSerio: boolean;
};

/** Palabras con carga informativa de un titular, normalizadas sin acentos. */
export function tokensSignificativos(titulo: string): Set<string> {
  const limpio = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
 * Palabras que aparecen en demasiados titulares de la misma tanda no distinguen
 * nada: "clima", "noviembre" o "viernes" salen en decenas de notas rutinarias.
 * Se descartan por frecuencia, sin lista fija, porque cambian cada día.
 */
const UMBRAL_FRECUENCIA = 0.06;

function tokensDistintivos(notas: NotaParaEvaluar[]): Set<string>[] {
  const crudos = notas.map((n) => tokensSignificativos(n.title));

  const frecuencia = new Map<string, number>();
  for (const set of crudos) {
    for (const token of set) frecuencia.set(token, (frecuencia.get(token) ?? 0) + 1);
  }

  // El piso evita que en tandas pequeñas el filtro se coma todo: una palabra
  // que sale en 8 titulares o menos nunca es relleno, por chica que sea la tanda.
  const tope = Math.max(8, Math.floor(notas.length * UMBRAL_FRECUENCIA));
  return crudos.map((set) => {
    const filtrado = new Set<string>();
    for (const token of set) if ((frecuencia.get(token) ?? 0) <= tope) filtrado.add(token);
    return filtrado;
  });
}

/**
 * Dos titulares hablan del mismo hecho si comparten suficientes palabras
 * distintivas Y esas palabras son una fracción alta del titular más corto. La
 * proporción es lo que evita que dos notas largas se unan por coincidencias
 * sueltas.
 */
/**
 * Calibrado con un barrido sobre 434 notas reales de 12 h (2026-11-20). Con
 * 3 palabras exigidas casi nada agrupaba (405 historias de 434 notas, cero
 * avisos); con proporción 0.2 volvían a aparecer grupos de 10 por coincidencias
 * sueltas. 2 palabras y 0.3 deja 372 historias, grupo mayor de 7, y 21 hechos
 * con dos o más medios detrás: suficiente para la portada y selectivo para los
 * avisos.
 */
const MIN_TOKENS_COMPARTIDOS = 2;
const MIN_PROPORCION = 0.3;

function hablanDelMismoHecho(a: Set<string>, b: Set<string>): boolean {
  const menor = Math.min(a.size, b.size);
  if (menor === 0) return false;
  const n = compartidos(a, b);
  return n >= MIN_TOKENS_COMPARTIDOS && n / menor >= MIN_PROPORCION;
}

/**
 * Agrupa las notas que hablan del mismo hecho.
 *
 * Deliberadamente SIN transitividad: antes, A se unía con B y B con C, y una
 * cadena de coincidencias sueltas terminaba fundiendo 66 notas sin relación
 * (pronósticos del clima de distintas ciudades) en un solo "hecho" con seis
 * medios detrás. Ahora cada grupo tiene una nota semilla y solo entran las que
 * se parecen A ELLA, así que un grupo no puede crecer por encadenamiento.
 */
export function agruparPorHecho(notas: NotaParaEvaluar[]): Historia[] {
  const tokens = tokensDistintivos(notas);
  const orden = notas
    .map((n, i) => i)
    .sort((x, y) => +notas[x].publishedAt - +notas[y].publishedAt);

  const asignada = new Array(notas.length).fill(false);
  const historias: Historia[] = [];

  for (const semilla of orden) {
    if (asignada[semilla]) continue;
    asignada[semilla] = true;
    const miembros = [semilla];

    for (const otra of orden) {
      if (asignada[otra]) continue;
      if (hablanDelMismoHecho(tokens[semilla], tokens[otra])) {
        asignada[otra] = true;
        miembros.push(otra);
      }
    }

    const grupo = miembros.map((i) => notas[i]);
    const comunes = [...tokens[semilla]].sort().slice(0, 4);

    historias.push({
      clave: comunes.join("-") || notas[semilla].id,
      titular: notas[semilla].title,
      fuentes: [...new Set(grupo.map((n) => n.sourceId))],
      notas: grupo,
      urgente: grupo.some((n) => tieneUrgencia(n.title)),
      respaldoSerio: grupo.some((n) => SECCIONES_SERIAS.has(n.category)),
    });
  }

  return historias;
}

/** Una historia merece notificación si la corroboran suficientes medios. */
export function esImportante(h: Historia): boolean {
  if (!h.respaldoSerio) return false;
  if (h.fuentes.length >= MIN_FUENTES) return true;

  // El atajo por urgencia existe para no llegar tarde a un hecho de ruptura,
  // pero exige que TODA la cobertura venga de secciones serias. Sin esa
  // condición dejaba pasar cosas como el cierre de una estación del metro por
  // un desfile: tres medios, marcador de urgencia, y nada que interrumpa el día.
  const todasSerias = h.notas.every((n) => SECCIONES_SERIAS.has(n.category));
  return h.urgente && todasSerias && h.fuentes.length >= MIN_FUENTES_CON_URGENCIA;
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

/**
 * Historias para la sección destacada de la portada.
 *
 * El umbral es más bajo que el de las notificaciones a propósito: un aviso
 * interrumpe y debe ser excepcional, mientras que encabezar el feed solo ordena
 * lo que el usuario ya decidió mirar. Tres medios bastan para merecer el primer
 * vistazo; cuatro, para sonar el teléfono.
 *
 * Con dos bastaba se colaba lo viral: un casco de Fórmula 1 que recogieron dos
 * portadas. Con tres quedan unas cuatro historias por cada 12 horas, que es
 * justo el máximo que muestra la sección.
 */
export function historiasDestacadas(
  notas: NotaParaEvaluar[],
  { minFuentes = 3, max = 4 }: { minFuentes?: number; max?: number } = {},
): Historia[] {
  return agruparPorHecho(notas)
    .filter((h) => h.respaldoSerio && h.fuentes.length >= minFuentes)
    .sort((a, b) => {
      if (b.fuentes.length !== a.fuentes.length) return b.fuentes.length - a.fuentes.length;
      if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
      // A igualdad, lo más reciente primero: entre dos hechos igual de cubiertos
      // el usuario quiere el de hoy, no el de ayer.
      return +b.notas[0].publishedAt - +a.notas[0].publishedAt;
    })
    .slice(0, max);
}
