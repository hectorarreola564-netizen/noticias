import { historiaMasImportante } from "@/lib/importancia";
import { prisma } from "@/lib/prisma";
import { enviarAviso } from "@/lib/push";

/**
 * Solo se avisa de hechos que varios medios independientes cubrieron a la vez
 * (ver src/lib/importancia.ts). No se avisa de "lo más reciente": una
 * notificación interrumpe, y lo último publicado casi nunca merece interrumpir.
 */

/** Ventana de noticias que se considera para decidir qué es importante. */
const HORAS_VENTANA = 6;
/** Piso entre dos avisos, para que una tanda de coberturas no dispare varios. */
const MINUTOS_ENTRE_AVISOS = 45;
/** Cuántas historias ya avisadas se recuerdan, para no repetir la misma. */
const MEMORIA = 60;

const CLAVE_ULTIMO = "ultimoAviso";
const CLAVE_HISTORIAS = "historiasAvisadas";

async function leer(clave: string): Promise<string | null> {
  const fila = await prisma.ajuste.findUnique({ where: { clave } });
  return fila?.valor ?? null;
}

async function guardar(clave: string, valor: string) {
  await prisma.ajuste.upsert({
    where: { clave },
    create: { clave, valor },
    update: { valor },
  });
}

export type ResultadoAviso = { aviso: string };

export async function avisarSiToca(hayNuevas: boolean): Promise<ResultadoAviso> {
  if (!hayNuevas) return { aviso: "sin notas nuevas" };

  const ultimo = await leer(CLAVE_ULTIMO);
  if (ultimo) {
    const minutos = (Date.now() - new Date(ultimo).getTime()) / 60000;
    if (minutos < MINUTOS_ENTRE_AVISOS) {
      return { aviso: `en pausa (${Math.round(MINUTOS_ENTRE_AVISOS - minutos)} min)` };
    }
  }

  const desde = new Date(Date.now() - HORAS_VENTANA * 60 * 60 * 1000);
  const notas = await prisma.article.findMany({
    where: { publishedAt: { gte: desde } },
    select: { id: true, title: true, sourceId: true, sourceName: true, category: true, publishedAt: true },
  });

  const historia = historiaMasImportante(notas);
  if (!historia) return { aviso: "nada lo bastante importante" };

  const previas: string[] = JSON.parse((await leer(CLAVE_HISTORIAS)) ?? "[]");
  if (previas.includes(historia.clave)) {
    return { aviso: "esa historia ya se avisó" };
  }

  const { enviados, borrados } = await enviarAviso({
    // El cuerpo lleva el titular; el título dice cuántos medios lo respaldan,
    // que es la razón por la que el aviso se consideró digno de interrumpir.
    title: `${historia.fuentes.length} medios lo cubren`,
    body: historia.titular,
    url: "/",
  });

  if (enviados > 0) {
    await guardar(CLAVE_ULTIMO, new Date().toISOString());
    await guardar(CLAVE_HISTORIAS, JSON.stringify([historia.clave, ...previas].slice(0, MEMORIA)));
  }

  return {
    aviso: `"${historia.titular.slice(0, 60)}…" · ${historia.fuentes.length} medios · enviados ${enviados}, caducados ${borrados}`,
  };
}
