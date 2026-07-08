# AGENTS.md

Guía de trabajo del proyecto **edibs-bug-portal** para quien contribuye (personas y agentes de IA). `CLAUDE.md` importa este fichero.

Portal interno de EDIBS para reportar bugs de los productos: crea issues en GitHub y avisa a Slack. Ver [README.md](./README.md) y [docs/plan.md](./docs/plan.md).

## Cómo trabajamos

- Rama de feature **desde `develop`** -> PR **a `develop`**. A `main` solo por PR.
- **Los merges los hace una persona, nunca un agente.**
- Commits: [Conventional Commits](https://www.conventionalcommits.org/), incrementales y en español.
- **Secretos y variables de entorno: en Vercel/Supabase, nunca en el repo** (`.env*` fuera del repo salvo `.env.example`).

## Convenciones

- Todo en español (comentarios, commits, PRs, issues, docs).
- **Nunca em dashes (—)**; usa comas, dos puntos o paréntesis. Separadores con `-` o `|`, nunca `·`.
- Sin rastros de IA en commits/PRs (nada de `Co-Authored-By` ni "Generated with...").
- Código legible y mantenible, imitando el estilo de alrededor.
- Los issues los lee toda la empresa: tono factual y constructivo.

## Reglas duras

1. Nunca `push` directo a `main`/`develop`: siempre por PR (excepción: primer push del repo).
2. Los merges los hace una persona.
3. Nada de secretos en el repo.
4. Nada de em dashes ni rastros de IA.
