import { historiasDestacadas } from "@/lib/importancia";
import { prisma } from "@/lib/prisma";
import type { Category } from "@/lib/feeds";
import { spreadSources, WINDOW_DAYS } from "@/lib/normalize";

export const CATEGORIES: { id: Category | "todo"; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "politica", label: "Política" },
  { id: "mercados", label: "Mercados" },
  { id: "sucesos", label: "Sucesos" },
  { id: "internacional", label: "Internacional" },
];

/** Inicio y fin del día que se está viendo. offset 0 = hoy, 1 = ayer, hasta 6. */
export function dayRange(offset: number, now: Date = new Date()) {
  const day = new Date(now);
  day.setDate(day.getDate() - offset);
  const from = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from, to };
}

export function clampOffset(raw: string | undefined): number {
  const n = Number(raw ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(Math.trunc(n), 0), WINDOW_DAYS - 1);
}

export async function articlesFor(offset: number, category: string | undefined) {
  const { from, to } = dayRange(offset);
  const rows = await prisma.article.findMany({
    where: {
      publishedAt: { gte: from, lt: to },
      ...(category && category !== "todo" ? { category } : {}),
    },
    orderBy: { publishedAt: "desc" },
    take: 200,
  });

  // El reparto es cosa de presentación, no de la ingesta: la base guarda el orden
  // cronológico puro y aquí se evita que un medio prolífico acapare la pantalla.
  return spreadSources(rows);
}

export type Portada = {
  /** Lo que cubren varios medios, encabezando el feed. */
  destacadas: { articulo: Awaited<ReturnType<typeof articlesFor>>[number]; medios: number }[];
  /** El resto, en orden cronológico. */
  resto: Awaited<ReturnType<typeof articlesFor>>;
};

/**
 * Separa la portada en "lo importante" y "lo reciente".
 *
 * El feed no se ordena solo por importancia: eso borraría la noción de qué
 * acaba de pasar, que es la mitad del valor de un lector de noticias. Arriba va
 * lo corroborado por varios medios y debajo sigue el orden cronológico, sin
 * repetir las notas ya mostradas.
 */
export async function portadaFor(offset: number, category: string | undefined): Promise<Portada> {
  const articulos = await articlesFor(offset, category);

  const historias = historiasDestacadas(
    articulos.map((a) => ({
      id: a.id,
      title: a.title,
      sourceId: a.sourceId,
      sourceName: a.sourceName,
      category: a.category,
      publishedAt: a.publishedAt,
    })),
  );

  const porId = new Map(articulos.map((a) => [a.id, a]));
  const destacadas: Portada["destacadas"] = [];
  const yaMostradas = new Set<string>();

  for (const h of historias) {
    // De cada historia se muestra la nota con foto si la hay: la sección
    // destacada es visual y una tarjeta grande sin imagen se ve rota.
    const candidatas = h.notas.map((n) => porId.get(n.id)!).filter(Boolean);
    const elegida = candidatas.find((a) => a.imageUrl) ?? candidatas[0];
    if (!elegida) continue;

    destacadas.push({ articulo: elegida, medios: h.fuentes.length });
    // Se ocultan del feed de abajo todas las notas de la historia, no solo la
    // elegida: ver cinco versiones del mismo hecho es justo lo que molesta.
    for (const n of h.notas) yaMostradas.add(n.id);
  }

  return { destacadas, resto: articulos.filter((a) => !yaMostradas.has(a.id)) };
}
