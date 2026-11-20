import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// La forma que entrega PushManager.subscribe() en el navegador.
const esquema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** Guarda (o refresca) la suscripción de este navegador. */
export async function POST(request: Request) {
  const cuerpo = await request.json().catch(() => null);
  const parsed = esquema.safeParse(cuerpo);
  if (!parsed.success) {
    return Response.json({ error: "suscripción inválida" }, { status: 400 });
  }

  const { endpoint, keys } = parsed.data;
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth },
    // Reaparecer limpia failedAt: el navegador volvió, así que vuelve a la lista.
    update: { p256dh: keys.p256dh, auth: keys.auth, failedAt: null },
  });

  return Response.json({ ok: true });
}

/** Deja de recibir avisos en este navegador. */
export async function DELETE(request: Request) {
  const cuerpo = await request.json().catch(() => null);
  const endpoint = typeof cuerpo?.endpoint === "string" ? cuerpo.endpoint : null;
  if (!endpoint) return Response.json({ error: "falta endpoint" }, { status: 400 });

  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
  return Response.json({ ok: true });
}
