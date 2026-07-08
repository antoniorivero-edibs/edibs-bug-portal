# edibs-bug-portal

Portal interno de EDIBS para que el equipo reporte bugs de los distintos productos (Metriks, y más adelante el CRM, etc.). Cada reporte **crea un issue de GitHub** en el repo del producto correcto y **avisa por Slack**.

> Estado: en construcción. Ver el plan en [docs/plan.md](./docs/plan.md) y el roadmap en los [issues](../../issues).

## Qué hace

1. La persona entra al portal (con login).
2. Elige el **producto**.
3. Rellena **título**, **descripción** y adjunta **fotos/vídeos**.
4. Al pulsar reportar: se crea un **issue** en el repo del producto (con quién reporta, email y adjuntos) y se **avisa en Slack** (#bug) con el enlace.
5. Cuando el issue se **cierra**, el aviso de Slack se marca como resuelto automáticamente (no se queda colgado).

## Stack (propuesto)

- **Next.js** en **Vercel** (formulario + funciones de servidor).
- **Supabase**: Auth (login) y Storage (adjuntos), más una tabla para mapear issue ↔ mensaje de Slack.
- **GitHub App** para crear issues y recibir el webhook de cierre.
- **Slack** (bot) para avisar y actualizar los mensajes.

## Convenciones

Ver [AGENTS.md](./AGENTS.md).
