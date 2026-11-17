# Spec: app de noticias (v1)

Status: ready-for-human

Lo que falta es crear las cuentas y desplegar, que solo puede hacer el dueño del
proyecto. El código está completo. Ver el README para los pasos.

## Qué es

Lector personal de noticias que agrega 15 fuentes RSS en un solo feed cronológico,
con una ventana de 7 días. Se instala en la pantalla de inicio del iPhone.

Categorías: política, mercados, sucesos, internacional, y general para los feeds de
portada que mezclan todo.

## Para quién

**Para el dueño del proyecto, no para terceros.** Esto se decidió explícitamente y
cambia el análisis de riesgo: no compite con Google News, porque no compite con
nadie. El valor es que está hecho a su gusto.

Si algún día se abre a otros usuarios, hay que reabrir esta decisión: "agregador
general gratuito" es el nicho más saturado que existe y, sin licencias ni ángulo
propio, entrar ahí sería el defecto fatal del plan.

## La restricción que manda

**Costo de operación: $0.** Sin servidor de pago, sin API de pago, sin plan
contratado. Cualquier decisión técnica que implique factura queda descartada por
definición, y esta regla gana sobre cualquier otra preferencia.

Garantía estructural: ninguna de las cuentas lleva tarjeta registrada. Al tope del
plan gratuito el servicio limita o pide subir de plan, pero no puede cobrar.

### Qué se dobló para respetarla

Dos requisitos originales chocaban con el costo cero en un iPhone, y se resolvieron
así:

- **"App nativa" → PWA.** Una app nativa firmada con un Apple ID gratuito caduca a
  los 7 días y hay que reinstalarla cada semana; quitar eso cuesta $99 al año. Una
  PWA instalada desde Safari da el mismo icono en la pantalla de inicio y la misma
  pantalla completa, sin caducar nunca. Precedente: ParlayLab, del mismo dueño, lleva
  meses funcionando así.
- **"Tiempo real" → cada 15 minutos.** Push instantáneo exige un servidor encendido.
  Un cron cada 15 minutos es indistinguible para titulares.

## Arquitectura

Copiada de ParlayLab, por decisión explícita: mismas cuentas, mismos patrones, nada
nuevo que aprender.

```
GitHub Actions (cron */15) ──POST /api/sync──> Next.js en Vercel ──> Supabase
                                                      │
                                                 lee 15 feeds RSS
```

- **Vercel** (Hobby): hospeda la app. Gratis para uso personal.
- **Supabase** (plan gratuito): Postgres con los titulares. El cron lo mantiene
  despierto; la ventana de 7 días lo mantiene diminuto.
- **GitHub Actions**: el reloj. Ilimitado en repos públicos, y por eso el repo es
  público. El cron de Vercel en plan gratuito solo corre una vez al día, así que no
  sirve.
- **Sin login**: la app no guarda nada del usuario, solo titulares públicos.

Nota: la versión anterior de este spec decía "sin backend". Se enmendó al descubrir
que una PWA no puede leer RSS directamente por CORS, y que el stack de ParlayLab ya
resolvía el problema sin costo.

## Fuentes

15 feeds verificados uno por uno, listados en `src/lib/feeds.ts` junto con una lista
de reserva de 7 más que también funcionan.

La categoría **no se adivina del contenido**: la hereda del feed, porque los medios
publican un RSS por sección. Las palabras clave son frágiles justo en los casos que
importan.

Idiomas mezclados, español e inglés, **sin traducir**: toda API de traducción se
cobra por carácter y eso rompe la regla principal.

## Modelo legal

Se muestran titular, resumen corto, medio y enlace. Al tocar, se abre el artículo en
el sitio del medio.

No se copia ni se reescribe el cuerpo del artículo. Esto es lo que separa un
agregador legítimo de una infracción de copyright, y no es negociable aunque sea
técnicamente fácil de hacer.

## Decisiones cerradas del v1

| Decisión | Resultado |
|---|---|
| Deduplicado | Solo exacto: misma URL (ya limpia de parámetros de rastreo) o titular idéntico. Agrupar coberturas distintas del mismo hecho queda para v2 |
| Historial | Ventana de 7 días; lo más viejo se purga solo en cada ingesta |
| Navegación | Un feed cronológico con chips de filtro, no pestañas por sección |
| Notificaciones push | Fuera del v1. El backend ya las haría posibles (iOS 16.4+ las soporta en PWA), pero una app de noticias generales que avisa de todo se silencia en tres días |
| Login | Ninguno |
| Dominio propio | Ninguno; la URL `.vercel.app` es gratis |

## Fuera de alcance en el v1

- Cuentas de usuario y sincronización entre dispositivos
- Resúmenes generados por IA del contenido de las noticias
- App nativa en la App Store (requiere los $99 anuales de Apple)
- Traducción automática

## Riesgos vivos

- **Fragilidad de las fuentes:** los feeds RSS cambian de formato, se caen o
  desaparecen sin avisar. Mitigado: cada feed falla por separado y la ingesta sigue
  con los demás; `scripts/check-feeds.ts` reporta cuál se cayó
- **Cobertura desigual:** la categoría "sucesos" cuelga de un solo feed (La Jornada ·
  Estados), que trae ~10 notas. Si se queda corta, hay más en la lista de reserva
- **Límites de los planes gratuitos:** Supabase da 500 MB. La ventana de 7 días
  mantiene la base muy por debajo, pero conviene no ampliarla sin medir
- **Tragedias como categoría:** contenido sensible. Exige atribución clara y cero
  texto inventado presentado como reportaje
