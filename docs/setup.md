# Puesta en marcha del portal

Estado de la infraestructura y pasos que faltan para dejar el portal operativo.

## Ya provisionado (hecho)

- **Repo:** `EDIBS-SCHOOL/edibs-bug-portal` (privado). Rama de trabajo: `feat/mvp-portal`.
- **Supabase:** proyecto `edibs-bug-portal` (ref `vktjjehjdpcliwxwjbzu`, org EDIBS, región `eu-west-1`).
  - Tabla `reportes` y bucket `adjuntos` creados (migraciones en `supabase/migrations`).
- **Vercel:** proyecto `edibs-bug-portal` (equipo EDIBS), conectado al repo de GitHub (deploy automático).
  - Producción: **https://edibs-bug-portal.vercel.app**
  - Variables ya cargadas: Supabase (URL, anon, service role), dominios permitidos, org y topic de GitHub, canal e IDs de Slack, `NEXT_PUBLIC_SITE_URL`.
- **Login:** sin auth. El usuario pone nombre + correo (validado por dominio: `edibschool.com`, `nuclio.school`, `indexmediamarketing.com`) y entra. No se envía nada. **Nada que configurar.**
- **Asignación:** los issues se asignan a `antoniorivero-edibs` y `adominguez-edibs` (editable en `src/lib/products.ts`).
- **Nombres de producto:** el usuario ve un alias amigable, no el nombre del repo. Por defecto sale del nombre del repo en title case; para fijarlo a mano, edita `ALIAS_OVERRIDES` en `src/lib/products.ts` (ej: `"edibs-crm-onboarding": "CRM Onboarding"`).

## Datos útiles (ya conocidos)

| Dato | Valor |
| --- | --- |
| URL del portal | `https://edibs-bug-portal.vercel.app` |
| Redirect de Supabase (para Google) | `https://vktjjehjdpcliwxwjbzu.supabase.co/auth/v1/callback` |
| URL del webhook (GitHub App) | `https://edibs-bug-portal.vercel.app/api/webhooks/github` |
| Org de GitHub | `EDIBS-SCHOOL` |
| Canal de Slack | `#bug` |

## Pendiente (requiere accesos que no tengo)

### 1. GitHub App

En `https://github.com/organizations/EDIBS-SCHOOL/settings/apps` -> **New GitHub App**:

- Nombre: EDIBS Bug Portal. Homepage: `https://edibs-bug-portal.vercel.app`.
- **Webhook**: activo. URL: `https://edibs-bug-portal.vercel.app/api/webhooks/github`. Secret: una cadena aleatoria (guárdala).
- **Permisos de repositorio**: Issues = Read & write; Metadata = Read-only.
- **Suscripción a eventos**: Issues.
- Instalación: solo esta cuenta.
- Crear -> anota el **App ID** -> genera una **private key** (descarga el `.pem`).
- **Install App** en los repos de producto -> tras instalar, coge el **Installation ID** (aparece en la URL de la instalación).

Me pasas: App ID, Installation ID, el `.pem` y el webhook secret. Yo cargo las env en Vercel.

### 2. Slack (pendiente de permisos de admin, issue #13)

Hace falta un **bot token** con `chat:write` (un webhook no sirve: solo publica, no edita, y editar es lo que marca el bug como resuelto). Requiere admin del workspace. Petición al admin:

> Crear una Slack app (From scratch) en el workspace de EDIBS con el scope de bot `chat:write`, instalarla e invitarla a `#bug`, y pasar el Bot User OAuth Token (`xoxb-...`).

Con el token me lo das y lo enciendo (`SLACK_BOT_TOKEN` en Vercel). El portal funciona sin Slack mientras tanto.

### 3. Productos reportables

Pon el topic `bug-portal` a cada repo que deba aparecer (p. ej. `metriks`). Esto lo puedo hacer yo con `gh` si me dices los repos. Para un nombre más amigable que el del repo, edita `ALIAS_OVERRIDES` en `src/lib/products.ts`.

## Variables de entorno

Referencia completa en `.env.example`. Las de Supabase y app ya están en Vercel; faltan GitHub App y Slack (salen de los pasos de arriba).
