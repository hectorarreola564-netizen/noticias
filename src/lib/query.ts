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
