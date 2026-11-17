# Noticias

App personal de noticias: política, mercados, sucesos e internacional en un solo
feed cronológico, con una ventana de 7 días. Se instala en la pantalla de inicio del
iPhone como PWA.

**Regla del proyecto: no debe costar nada.** Todo corre en planes gratuitos
(Vercel, Supabase, GitHub Actions). No le pongas tarjeta a ninguna de esas cuentas:
sin método de pago registrado el cobro es imposible, no solo improbable.

El alcance y las decisiones de diseño están en
[`.scratch/news-aggregator/spec.md`](.scratch/news-aggregator/spec.md).

## Cómo funciona

```
GitHub Actions (cron cada 15 min)
      │  POST /api/sync  (Authorization: Bearer CRON_SECRET)
      ▼
Next.js en Vercel ──lee 15 feeds RSS──> parsea, deduplica, recorta a 7 días
      │
      ▼
Supabase (Postgres)  ──>  portada, ordenada por fecha
```

No hay login ni datos tuyos guardados: la base solo tiene titulares públicos.

## 1. Instalación local

Necesitas Node.js 20 o superior.

```bash
npm install
```

Para verificar que las fuentes responden y el parseo funciona, **sin base de datos**:

```bash
npx tsx scripts/check-feeds.ts
```

## 2. Base de datos (Supabase)

1. Crea un proyecto gratis en [supabase.com](https://supabase.com).
2. En **Project Settings → Database → Connection string**, copia la de
   **Connection pooling** (puerto `6543`), no la directa: Vercel abre y cierra
   conexiones en cada request.
3. Copia `.env.example` a `.env` y pega la cadena en `DATABASE_URL`.
4. Crea la tabla:

```bash
npx prisma migrate dev --name init
```

El plan gratuito de Supabase pausa proyectos tras una semana sin actividad; el cron
cada 15 minutos lo mantiene despierto solo.

## 3. Publicar (Vercel)

1. Sube el repo a GitHub. **Hazlo público**: GitHub Actions no tiene límite de
   minutos en repos públicos, y es lo que paga el cron cada 15 minutos. No hay nada
   secreto en el código — las llaves van en los secretos de GitHub y de Vercel.
2. En [vercel.com](https://vercel.com), **Add New → Project** e importa el repo.
   Detecta Next.js solo.
3. Agrega las variables de entorno antes de desplegar:
   - `DATABASE_URL`: la misma de Supabase.
   - `CRON_SECRET`: genera uno con `openssl rand -hex 32`.
4. **Deploy**. Te queda una URL tipo `https://tu-proyecto.vercel.app`.

## 4. Activar el cron (GitHub Actions)

En el repo de GitHub, **Settings → Secrets and variables → Actions**, agrega:

- `APP_URL`: la URL de Vercel, **sin** `/` al final.
- `CRON_SECRET`: el mismo valor exacto que pusiste en Vercel.

El workflow [`sync.yml`](.github/workflows/sync.yml) corre solo cada 15 minutos.
Para forzar una corrida ahora: pestaña **Actions** → *Sincronizar noticias* → **Run
workflow**.

Para correr la ingesta desde tu máquina:

```bash
npx tsx --env-file=.env scripts/sync.ts
```

## 5. Instalar en el iPhone

1. Abre la URL de Vercel en **Safari** (tiene que ser Safari, no Chrome).
2. Botón de compartir → **Añadir a pantalla de inicio**.

Queda con icono propio y abre a pantalla completa, sin barra de Safari. No caduca
nunca: a diferencia de una app nativa firmada con un Apple ID gratuito, una PWA no
hay que reinstalarla cada 7 días.

## Fuentes

Las 15 del v1 están en [`src/lib/feeds.ts`](src/lib/feeds.ts), cada una verificada a
mano. La categoría no se adivina del texto: la hereda del feed, porque los medios
publican un RSS por sección.

Para agregar una fuente, muévela de `FEEDS_RESERVA` a `FEEDS`, o agrega una nueva
con su categoría y región. Si un feed deja de responder, la ingesta lo salta y sigue
con los otros 14; `scripts/check-feeds.ts` te dice cuál se cayó.

## Pruebas

```bash
npm test
```

Cubren los tres puntos donde la lógica se puede romper en silencio: el parseo de RSS
y Atom (incluidos feeds malformados), el deduplicado y la ventana de 7 días.
