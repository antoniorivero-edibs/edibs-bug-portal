# Puesta en marcha del portal

Estado de la infraestructura y pasos que faltan para dejar el portal operativo.

## Ya provisionado (hecho)

- **Repo:** `EDIBS-SCHOOL/edibs-bug-portal` (privado).
- **Supabase:** proyecto `edibs-bug-portal` (ref `vktjjehjdpcliwxwjbzu`, org EDIBS, región `eu-west-1`).
  - Tabla `reportes` y bucket `adjuntos` creados (migraciones en `supabase/migrations`).
- **Vercel:** proyecto `edibs-bug-portal` (equipo EDIBS), conectado al repo de GitHub.
  - Producción: **https://edibs-bug-portal.vercel.app**
  - Variables ya cargadas: Supabase (URL, anon, service role), dominios permitidos, org y topic de GitHub, canal e IDs de Slack, `NEXT_PUBLIC_SITE_URL`.
- **Login:** código listo para **Google SSO** (único método), restringido a `edibschool.com`, `nuclio.school` e `indexmediamarketing.com`.

## Pendiente (requiere accesos que no tengo)

### 1. Google SSO (para que funcione el login)

En **Google Cloud Console** (proyecto de EDIBS):

1. APIs y servicios -> Pantalla de consentimiento OAuth: tipo **Interno** (así solo entra gente de la org de Google).
2. Credenciales -> Crear credenciales -> **ID de cliente de OAuth** -> Aplicación web.
3. URI de redirección autorizado:
   `https://vktjjehjdpcliwxwjbzu.supabase.co/auth/v1/callback`
4. Copia el **Client ID** y el **Client secret**.

Luego se activa el proveedor Google en Supabase con esas credenciales (lo puedo hacer yo con el `client_id` y el `secret`, o desde el dashboard de Supabase: Authentication -> Providers -> Google).

### 2. GitHub App (para listar productos, crear issues y el webhook)

Crear una **GitHub App** en la org `EDIBS-SCHOOL`:

- Permisos: **Issues: Read & write**, **Metadata: Read-only**.
- Eventos de webhook: **Issues**.
- Webhook URL: `https://edibs-bug-portal.vercel.app/api/webhooks/github`
- Webhook secret: genera uno y guárdalo.
- Genera una **private key** (PEM).
- Instala la App en los repos de producto (los que tengan el topic `bug-portal`).

Variables que salen de aquí: `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`.

### 3. Slack (para avisar en #bug)

Crear una **Slack app** en el workspace de EDIBS:

- Scope de bot: `chat:write`.
- Instálala y coge el **Bot User OAuth Token** (`xoxb-...`).
- Invita al bot al canal `#bug`.

Variable: `SLACK_BOT_TOKEN`. (El canal e IDs de devs ya están configurados.)

### 4. Productos reportables

Pon el topic `bug-portal` a cada repo que deba aparecer en el portal (p. ej. `metriks`).

## Variables de entorno

La referencia completa está en `.env.example`. Las de Supabase y app ya están en Vercel; faltan las de Google, GitHub App y Slack (secciones de arriba).
