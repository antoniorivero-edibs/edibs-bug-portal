# Plan del portal de bugs

Decisiones cerradas y arquitectura del MVP. El roadmap detallado está en los issues.

## Flujo

`login -> elegir producto -> título + descripción + fotos/vídeos -> reportar`

Al reportar: se crea un issue en el repo del producto (con quién reporta, email y adjuntos) y se avisa en Slack (#bug). Al cerrarse el issue, el mensaje de Slack se marca como resuelto.

## Decisiones cerradas

- **Login:** **Google SSO** (Supabase Auth), único método de acceso. Restringido a los dominios `@edibschool.com`, `@nuclio.school` e `@indexmediamarketing.com` (el chequeo de dominio se hace en el callback tras el OAuth). Necesita un OAuth Client de Google Cloud (client id + secret) configurado en el proveedor Google de Supabase.
- **Lista de productos:** dinámica pero curada, **por topic de GitHub**. El portal lista los repos de la org con el topic `bug-portal`. Añadir un producto = poner el topic al repo (cero cambios en el portal). Alias por defecto desde el nombre/descripción del repo, con mapa de overrides opcional.
- **Campos del form:** título, descripción, fotos/vídeos. La severidad y demás la pone el equipo al triar (etiquetas).
- **Adjuntos:** hasta 5 archivos, 50 MB cada uno. Imágenes `png/jpg/webp/gif` (van incrustadas en el issue), vídeos `mp4/mov/webm` (van como enlace). Se suben a Supabase Storage.
- **Slack:** canal `#bug`. Mención a los devs por producto (IDs de Slack: Antonio `U0BAU7N7ZSA`, Ángel `U0BC1RE5NUT`). Al cerrar el issue, el mensaje se actualiza a resuelto (no se borra, se marca).
- **Repo:** este (`edibs-bug-portal`), privado. Proyecto propio en Vercel.

## Arquitectura

- **App Next.js en Vercel:** formulario + rutas de servidor.
- **Crear issue:** ruta de servidor que usa el token de una **GitHub App** (permiso de issues en los repos con topic `bug-portal`). El cuerpo incluye lo que escribe la persona + reporter (nombre/email del login) + adjuntos + metadatos (fecha, navegador/URL).
- **Slack:** al crear el issue, `chat.postMessage` a `#bug` y se guarda el `ts` del mensaje.
- **Marcar resuelto:** la GitHub App recibe por **webhook** los eventos de issues; al `closed`, se busca el `ts` guardado y se hace `chat.update` (marcar resuelto); al `reopened`, se revierte.
- **Supabase:** Auth (login), Storage (adjuntos) y una tabla `reportes` que mapea `repo + issue -> {slack_channel, slack_ts}` (necesaria para actualizar el mensaje al cerrar).

## Pendiente (en issues)

- Análisis con IA: comentario automático que estructura el reporte (pasos, esperado/real, área, severidad sugerida) conservando el texto original. Con llamada directa a Claude, no CodeRabbit (que es para PRs). v2: que señale ficheros candidatos leyendo el repo.
- Mapa de overrides de alias/etiquetas por producto.

## Accesos necesarios (para desplegarlo)

- Proyecto en **Vercel** (conectado a este repo).
- Proyecto en **Supabase** (Auth + Storage) para el portal.
- **GitHub App** del portal (issues + webhook de issues) instalada en los repos de producto.
- **Slack:** una app/bot con permiso para postear y actualizar en `#bug`, y su token.
- Usuarios de **GitHub** de Antonio y Ángel (para asignar issues).
