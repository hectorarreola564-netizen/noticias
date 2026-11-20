// web-push es CommonJS y no expone `default`: hay que importar por nombre o el
// empaquetador de Next falla al construir.
import { sendNotification, setVapidDetails } from "web-push";
import { prisma } from "@/lib/prisma";

/**
 * Web Push con llaves VAPID propias: no hay servicio de terceros de por medio ni
 * nada que pagar. El navegador del usuario habla con el servicio de push de su
 * plataforma (Apple, en iPhone) y nosotros solo firmamos el mensaje.
 *
 * En iOS esto solo funciona con la app instalada en la pantalla de inicio: desde
 * una pestaña de Safari el navegador ni siquiera ofrece suscribirse.
 */
function configurado(): boolean {
  return Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
  );
}

function configurar() {
  setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

export type Aviso = { title: string; body: string; url: string };

/**
 * Manda un aviso a todos los navegadores suscritos. Devuelve cuántos lo
 * recibieron. Una suscripción caducada (404/410) se borra: el navegador la tiró
 * y reintentarla en cada sincronización es trabajo perdido.
 */
export async function enviarAviso(aviso: Aviso): Promise<{ enviados: number; borrados: number }> {
  if (!configurado()) return { enviados: 0, borrados: 0 };
  configurar();

  const subs = await prisma.pushSubscription.findMany({ where: { failedAt: null } });
  let enviados = 0;
  let borrados = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(aviso),
        );
        enviados++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
          borrados++;
        } else {
          await prisma.pushSubscription
            .update({ where: { id: s.id }, data: { failedAt: new Date() } })
            .catch(() => {});
        }
      }
    }),
  );

  return { enviados, borrados };
}
