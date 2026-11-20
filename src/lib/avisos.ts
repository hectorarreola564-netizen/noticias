import { prisma } from "@/lib/prisma";
import { enviarAviso } from "@/lib/push";

/**
 * Cuánto debe pasar entre dos avisos. La sincronización corre cada 15 minutos;
 * avisar en cada una serían casi cien notificaciones al día, que es exactamente
 * lo que lleva a silenciar una app. Una cada dos horas mantiene el valor de
 * enterarse sin volverse ruido.
 */
const HORAS_ENTRE_AVISOS = 2;
const CLAVE = "ultimoAviso";

/**
 * Avisa de la nota más reciente, si toca. Devuelve qué pasó para que la respuesta
 * de /api/sync lo deje ver sin tener que mirar logs.
 */
export async function avisarSiToca(hayNuevas: boolean) {
  if (!hayNuevas) return { aviso: "sin notas nuevas" as const };

  const ultimo = await prisma.ajuste.findUnique({ where: { clave: CLAVE } });
  if (ultimo) {
    const transcurridas = (Date.now() - new Date(ultimo.valor).getTime()) / 36e5;
    if (transcurridas < HORAS_ENTRE_AVISOS) {
      return { aviso: `en pausa, faltan ${(HORAS_ENTRE_AVISOS - transcurridas).toFixed(1)} h` };
    }
  }

  const nota = await prisma.article.findFirst({ orderBy: { publishedAt: "desc" } });
  if (!nota) return { aviso: "sin notas que anunciar" as const };

  const { enviados, borrados } = await enviarAviso({
    title: nota.sourceName,
    body: nota.title,
    url: "/",
  });

  // Solo se marca si de verdad salió a alguien: si no hay nadie suscrito, no
  // tiene sentido quemar la ventana de dos horas.
  if (enviados > 0) {
    await prisma.ajuste.upsert({
      where: { clave: CLAVE },
      create: { clave: CLAVE, valor: new Date().toISOString() },
      update: { valor: new Date().toISOString() },
    });
  }

  return { aviso: `enviados ${enviados}, suscripciones caducadas ${borrados}` };
}
