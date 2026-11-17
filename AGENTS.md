# AGENTS.md

Project-level instructions for coding agents working in this repo.

## El proyecto

Lector personal de noticias (PWA). Next.js en Vercel, Supabase para los titulares y
GitHub Actions como cron cada 15 minutos. Ver el [README](./README.md) para el
despliegue y [`.scratch/news-aggregator/spec.md`](./.scratch/news-aggregator/spec.md)
para el alcance y las decisiones ya cerradas.

Dos reglas que no se negocian:

1. **Costo de operación $0.** Cualquier propuesta que implique factura mensual está
   descartada de entrada, por decisión del dueño. Ninguna cuenta lleva tarjeta.
2. **Solo titular, resumen, medio y enlace.** Nunca copiar ni reescribir el cuerpo de
   un artículo: es lo que separa este agregador de una infracción de copyright.

La lógica pura de ingesta (`src/lib/rss.ts`, `src/lib/normalize.ts`) está cubierta
por tests y se construyó test-first. Al tocarla, empieza por el test.

## Agent skills

### Issue tracker

Issues and specs live as markdown files under `.scratch/<feature-slug>/` in this repo; there is no remote tracker. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`), recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root, both created lazily by `/domain-modeling` rather than upfront. See `docs/agents/domain.md`.
