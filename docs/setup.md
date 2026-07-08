# Puesta en marcha del portal

Estado de la infraestructura y pasos que faltan para dejar el portal operativo.

## Ya provisionado (hecho)

- **Repo:** `EDIBS-SCHOOL/edibs-bug-portal` (privado). Rama de trabajo: `feat/mvp-portal`.
- **Supabase:** proyecto `edibs-bug-portal` (ref `vktjjehjdpcliwxwjbzu`, org EDIBS, región `eu-west-1`).
  - Tabla `reportes` y bucket `adjuntos` creados (migraciones en `supabase/migrations`).
- **Vercel:** proyecto `edibs-bug-portal` (equipo EDIBS), conectado al repo de GitHub (deploy automático).
  - Producción: **https://edibs-bug-portal.vercel.app**
  - Variables ya cargadas: Supabase (URL, anon, service role), dominios permitidos, org y topic de GitHub, canal e IDs de Slack, `NEXT_PUBLIC_SITE_URL`.
- **Login:** Google SSO (único método), restringido a `edibschool.com`, `nuclio.school`, `indexmediamarketing.com`.
- **Asignación:** los issues se asignan a `antoniorivero-edibs` y `adominguez-edibs` (editable en `src/lib/products.ts`).

## Datos útiles (ya conocidos)

| Dato | Valor |
| --- | --- |
| URL del portal | `https://edibs-bug-portal.vercel.app` |
| Redirect de Supabase (para Google) | `https://vktjjehjdpcliwxwjbzu.supabase.co/auth/v1/callback` |
| URL del webhook (GitHub App) | `https://edibs-bug-portal.vercel.app/api/webhooks/github` |
| Org de GitHub | `EDIBS-SCHOOL` |
| Canal de Slack | `#bug` |

## Pendiente (requiere accesos que no tengo)

### 1. Google SSO (login)

En **Google Cloud Console** (con una cuenta de EDIBS):

1. Crea o elige un proyecto (p. ej. "EDIBS Bug Portal").
2. **Pantalla de consentimiento OAuth**:
   - Si los tres dominios están en el mismo Google Workspace: tipo **Interno**.
   - Si no: tipo **Externo** (el portal ya bloquea dominios que no sean de EDIBS en el callback, así que da igual que Google deje autenticar a otros; el portal los rechaza).
   - Rellena nombre de la app y correos de soporte.
3. **Credenciales -> Crear credenciales -> ID de cliente de OAuth -> Aplicación web**.
   - URI de redirección autorizado: `https://vktjjehjdpcliwxwjbzu.supabase.co/auth/v1/callback`
4. Copia **Client ID** y **Client secret**.

Con esas dos cadenas activo el proveedor Google en Supabase y empujo la config de Auth (Site URL + redirects + desactivar email). Alternativa manual: Supabase -> Authentication -> Providers -> Google -> pegar y guardar.

### 2. GitHub App

En `https://github.com/organizations/EDIBS-SCHOOL/settings/apps` -> **New GitHub App**:

- Nombre: EDIBS Bug Portal. Homepage: `https://edibs-bug-portal.vercel.app`.
- **Webhook**: activo. URL: `https://edibs-bug-portal.vercel.app/api/webhooks/github`. Secret: una cadena aleatoria (guárdala).
- **Permisos de repositorio**: Issues = Read & write; Metadata = Read-only.
- **Suscripción a eventos**: Issues.
- Instalación: solo esta cuenta.
- Crear -> anota el **App ID** -> genera una **private key** (descarga el `.pem`).
- **Install App** en los repos de producto -> tras instalar, coge el **Installation ID** (aparece en la URL de la instalación).

Me pasas: App ID, Installation ID, el `.pem` y el webhook secret. Yo cargo las env en Vercel.

### 3. Slack

En `https://api.slack.com/apps` -> **Create New App -> From scratch** (workspace de EDIBS):

- OAuth & Permissions -> Bot Token Scopes -> añade `chat:write`.
- Install to Workspace -> copia el **Bot User OAuth Token** (`xoxb-...`).
- En Slack, invita al bot al canal: `/invite @EDIBS Bug Portal` en `#bug`.

Me pasas el `xoxb-...`.

### 4. Productos reportables

Pon el topic `bug-portal` a cada repo que deba aparecer (p. ej. `metriks`). Esto lo puedo hacer yo con `gh` si me dices los repos.

## Variables de entorno

Referencia completa en `.env.example`. Las de Supabase y app ya están en Vercel; faltan Google, GitHub App y Slack (sale de los pasos de arriba).
