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
- **GitHub App:** creada, instalada en todos los repos y conectada (App ID, Installation ID, private key y webhook secret cargados en Vercel). Verificada de punta a punta: lista productos, crea issues con asignados y el webhook marca el estado al cerrar.
- **Productos activos:** `metrik-wiz-stars` (**Metriks**) y `vertice-brandeador` (**Vértice Brandeador**), con topic `bug-portal`.
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

## Pendiente

### 1. Slack (pendiente de permisos de admin, issue #13)

Hace falta un **bot token** con `chat:write` (un webhook no sirve: solo publica, no edita, y editar es lo que marca el bug como resuelto). Requiere admin del workspace. Petición al admin:

> Crear una Slack app (From scratch) en el workspace de EDIBS con el scope de bot `chat:write`, instalarla e invitarla a `#bug`, y pasar el Bot User OAuth Token (`xoxb-...`).

Con el token me lo das y lo enciendo (`SLACK_BOT_TOKEN` en Vercel). El portal funciona sin Slack mientras tanto.

### 2. IA (opcional, issues #9 y #10): triaje + investigación del repo

El código ya está (modelo `claude-sonnet-5`, permiso `contents: read` de la App concedido). Al crear el issue, si hay `ANTHROPIC_API_KEY`, Claude trabaja en **segundo plano** (no bloquea al que reporta) y publica **2 comentarios** por orden de importancia:

1. **Triaje** (rápido): resumen, qué ocurre, severidad sugerida y categoría; aplica las labels que decida (creándolas si faltan).
2. **Investigación del código** (lee el repo): causa probable y ficheros/áreas candidatas con enlaces, para que un dev retome el issue en Claude Code con el grueso hecho.

Para activarlo: pásame una API key de Anthropic (`sk-ant-...`) y la cargo en Vercel. Modelo configurable con `ANTHROPIC_MODEL` (por defecto `claude-sonnet-5`; subir a `claude-opus-4-8` para casos difíciles).

### 3. Panel de administración (`/panel`)

Los productos ya **no** se controlan por topic, sino desde la **tabla `productos`** de Supabase, gestionada desde `/panel` (login con GitHub, acceso solo a miembros de la org). El panel también lista todos los bugs de todos los repos.

Para que el **login del panel** funcione, en la GitHub App (Settings de la App):
1. **Client secrets → Generate a new client secret** → me lo pasas (`GITHUB_APP_CLIENT_SECRET`). El Client ID ya está.
2. **Callback URL**: añade `https://edibs-bug-portal.vercel.app/api/panel/auth/callback`.
3. **Organization permissions → Members: Read-only** (para comprobar que quien entra es de la org).
4. **Repository permissions → Administration: Read and write** (para sincronizar la descripción del repo a GitHub).
5. Aprueba la actualización de permisos en la instalación.

Con el client secret me lo das y lo cargo (`GITHUB_APP_CLIENT_SECRET`). El resto de variables del panel ya están en Vercel.

### 4. Productos reportables

Se gestionan desde `/panel` (mostrar/ocultar, alias, descripción). Nada de topics ni código.

## Variables de entorno

Referencia completa en `.env.example`. Las de Supabase y app ya están en Vercel; faltan GitHub App y Slack (salen de los pasos de arriba).
