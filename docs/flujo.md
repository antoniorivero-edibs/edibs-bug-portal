# Flujo, estados y estructuras (referencia)

Referencia de todo lo que produce el portal: flujo completo, estados, cómo queda un issue en GitHub y todos los mensajes de Slack (bugs y sugerencias). Para revisión del equipo.

---

## 1. Tipos de reporte

El portal maneja dos tipos, elegidos por quien reporta antes de rellenar nada:

| Tipo | Qué es | Ruta |
| --- | --- | --- |
| **🐞 Bug** | Algo que no funciona como debería | `/report/[repo]/bug` |
| **💡 Sugerencia** | Una función, cambio o mejora (no un error) | `/report/[repo]/sugerencia` |

En `/report/[repo]` se elige el tipo (no se muestra formulario hasta elegir, para no enviar en el que no es).

Diferencias de tratamiento:

| | Bug | Sugerencia |
| --- | --- | --- |
| Labels | `portal` + las que decide Claude | `portal` + `enhancement` |
| Asignados | Antonio y Ángel | **Sin asignar** (se autoasigna con el botón de Slack) |
| Análisis IA (triaje + investigación) | Sí | **No** |
| Aviso en Slack | Con menciones a los devs | **Sin mención**, con botón "🙋 Me la quedo" |
| Hilo de seguimiento | Sí | Sí |

**Reparto de responsabilidades:** Slack = para que lo veáis las personas. GitHub issue = para el análisis técnico (dev + Claude Code).

---

## 2. Flujo completo

1. La persona entra al portal, se identifica (**nombre + correo**, validado por dominio en servidor; sin verificación).
2. Elige **producto** (los `visible=true` de la tabla `productos`) y luego **tipo** (bug o sugerencia).
3. Rellena **título + descripción + adjuntos**. Los adjuntos suben directos a Supabase Storage con URL firmada (bucket `adjuntos`, público en lectura).
4. `POST /api/report` (servidor):
   1. Valida identidad (dominio), producto y adjuntos.
   2. Crea el **issue en GitHub** (GitHub App) con cuerpo formateado. Bug: asignado a los devs. Sugerencia: sin asignar.
   3. Aplica labels: `portal` (bug) o `portal` + `enhancement` (sugerencia).
   4. Resuelve el **usuario de Slack del reporter** por su correo (`users.lookupByEmail`).
   5. Publica el **aviso en Slack** (`bug-portal`) y abre un **hilo de seguimiento**.
   6. Guarda todo en la tabla **`reportes`**.
   7. **Responde al instante** al navegador (pantalla de gracias, sin enlaces internos).
5. **En segundo plano** (`after()`), solo para bugs y si hay `ANTHROPIC_API_KEY`, Claude:
   1. **Triaje**: comenta en el issue, aplica labels de categoría y lo vuelca al hilo de Slack.
   2. **Investigación**: lee el repo, comenta causa probable + ficheros candidatos y lo vuelca al hilo.
6. **Sugerencia**: cuando alguien del equipo pulsa "Me la quedo" en Slack → se le asigna el issue en GitHub, se guarda en `reportes` y el mensaje se edita (quita el botón, muestra el asignado).
7. Cuando el issue se **cierra/reabre** en GitHub → webhook → actualiza el aviso de Slack, el estado en `reportes` y lo anota en el hilo.

---

## 3. Estados

| Cosa | Dónde | Valores |
| --- | --- | --- |
| Tipo | `reportes.tipo` | `bug` / `sugerencia` |
| Estado del reporte | `reportes.estado` | `abierto` / `cerrado` (sincronizado por el webhook) |
| Issue en GitHub | GitHub | `open` / `closed` (+ evento `reopened`) |
| Triaje IA (solo bugs) | `reportes.ia_triaje` (+ `ia_triaje_url`) | `false` → `true` cuando Claude comenta |
| Investigación IA (solo bugs) | `reportes.ia_investigacion` (+ `ia_investigacion_url`) | `false` → `true` cuando Claude comenta |
| Slack | `reportes.slack_ts` / `slack_permalink` | `null` si Slack no configurado o falló; con valor si se avisó |
| Reporter en Slack | `reportes.reporter_slack_id` | ID (`U…`) si se encontró por correo; `null` si no |
| Asignado (sugerencias) | `reportes.asignado_github` / `asignado_slack` | `null` hasta que alguien pulsa "Me la quedo" |
| Producto | `productos.visible` | `true` (aparece en el portal) / `false` (oculto) |

En el panel `/admin`, los chips de IA muestran: `✓` (hecho, con enlace al comentario), `pendiente` (IA activa, aún no terminó) u `off` (sin `ANTHROPIC_API_KEY`). Las sugerencias muestran el asignado (o "sin asignar").

---

## 4. GitHub

### 4.1 Cuerpo del issue

```markdown
## Descripción            (o "## Sugerencia" si es sugerencia)
<texto tal cual lo escribió la persona>

## Adjuntos
![nombre.png](https://…storage…/adjuntos/…)      <- imágenes incrustadas
**Vídeos**
- [demo.mp4](https://…)                            <- vídeos como enlace
(o "_Sin adjuntos._")

## Datos del reporte
| | |
|---|---|
| **Reportado por** | Ángel Martín (a.dominguez@edibschool.com) |
| **Fecha** | 2026-07-08T12:00:00.000Z |
| **Origen** | https://portal/metrics |
| **Navegador** | Mozilla/5.0 … |
```

### 4.2 Labels
- **`portal`**: siempre.
- **`enhancement`**: solo sugerencias.
- **Categoría/área** (solo bugs): las decide Claude en el triaje (`frontend`, `auth`, `datos`…). Se crean solas si no existen. Base sugerida en `src/lib/products.ts` (`CATEGORIAS_SUGERIDAS`).

### 4.3 Asignados
- **Bug**: `antoniorivero-edibs` y `adominguez-edibs`.
- **Sugerencia**: sin asignar; se asigna quien pulsa "Me la quedo" (solo equipo, mapa Slack→GitHub en `products.ts`).

### 4.4 Comentarios de IA (solo bugs)

Comentario 1 — Triaje:
```markdown
## 🔎 Triaje automático

### 📝 Resumen
…

### 🐞 Qué ocurre
…

### 🚦 Severidad sugerida
🟡 media — <justificación>            (🟢 baja · 🟡 media · 🟠 alta · 🔴 crítica)

### 🏷️ Categoría / etiquetas
frontend, datos
```

Comentario 2 — Investigación (`### 🎯 Causa probable`, `### 📂 Ficheros / áreas candidatas`, `### 🛠️ Para el dev`).

### 4.5 Webhook consumido
Evento **`issues`**, acciones `closed` y `reopened`. Firma validada con `GITHUB_WEBHOOK_SECRET`.

---

## 5. Slack

Canal: **`bug-portal`** (`SLACK_BUG_CHANNEL` = ID `C0BFWS9EPJN`). Todos los mensajes cuelgan de este canal; el análisis de IA y los cambios de estado se anotan en el **hilo** del aviso.

### 5.1 Aviso de bug (nuevo)
1. `:beetle: *Nuevo bug en <producto>*`
2. `*<título>*` + descripción
3. Imágenes incrustadas (hasta 5) · vídeos como enlace
4. `:bust_in_silhouette: Reporta <@reporter> (correo)` (mención si está en Slack)
5. `<@dev1> <@dev2>` (menciones a los devs, sin "cc")
6. Botón **"Ver issue en GitHub"**

### 5.2 Aviso de sugerencia (nuevo)
1. `:bulb: *Nueva sugerencia en <producto>*`
2. `*<título>*` + descripción
3. Imágenes incrustadas (hasta 5)
4. `:bust_in_silhouette: Sugerida por <@reporter> (correo)` (sin mención a devs)
5. Botones: **"🙋 Me la quedo"** + **"Ver issue en GitHub"**

### 5.3 Sugerencia asignada (tras pulsar "Me la quedo")
El mensaje se edita:
1. `:bulb: *Sugerencia en <producto>*`
2. `*<título>*`
3. `:raising_hand: Asignada a <@asignado> · sugerida por *<reporter>* (correo)`
4. Botón **"Ver issue en GitHub"** (se quita "Me la quedo")

### 5.4 Hilo de seguimiento
Se abre automáticamente con:
```text
🧵 Seguimiento y actualizaciones — aquí se registran el estado y el análisis de la IA. Comentad lo que haga falta.
```
Dentro caen: análisis de IA (bugs), `✅ Resuelto` / `🔄 Reabierto`, y vuestros mensajes.

### 5.5 Estado: cerrado / reabierto (edición del aviso principal)
- **Cerrado** (limpio, sin botón, para distinguirlo del abierto):
  - Bug: `:white_check_mark: *Resuelto - <producto>*` + `<url|título>`
  - Sugerencia: `:white_check_mark: *Sugerencia resuelta - <producto>*` + `<url|título>`
- **Reabierto** (vuelve la cabecera de abierto + botón "Ver issue en GitHub"):
  - Bug: `:beetle: *Nuevo bug en <producto>*`
  - Sugerencia: `:bulb: *Sugerencia en <producto>*`
  - **Nota**: al reabrir se recupera el botón "Ver issue en GitHub", pero **no** las imágenes, menciones ni el botón "Me la quedo" del mensaje original (esos datos no se reconstruyen).

---

## 6. ¿Qué pasa si NO se encuentra al usuario en Slack?

`users.lookupByEmail` puede no encontrarlo (correo distinto al de Slack, invitado externo, Slack sin configurar). No se rompe nada; solo cambia lo relativo a ese usuario:

| Efecto | Slack encontrado | Sin encontrar (`reporter_slack_id = null`) |
| --- | --- | --- |
| Aviso en Slack | Igual | Igual |
| "Reporta / Sugerida por …" | Mención `@usuario` | Solo nombre en negrita |
| "Escribir por Slack" en el panel | Aparece (DM directo) | No aparece (solo nombre + correo) |
| Issue, labels, IA, estado, botón | Igual | Igual |

Si Slack no está configurado (`SLACK_BOT_TOKEN` ausente): no hay aviso ni hilo (`slack_* = null`), pero el issue se crea igual.

---

## 7. Tablas de datos (Supabase)

- **`productos`**: `repo, alias, descripcion, visible, orden`. Fuente de la lista del portal (curada desde `/admin`).
- **`reportes`**: `repo, issue_number, issue_url, tipo, titulo, estado, reporter_nombre, reporter_email, reporter_slack_id, asignado_github, asignado_slack, descripcion, adjuntos(jsonb), navegador, url_origen, slack_channel, slack_ts, slack_permalink, ia_triaje(+_url), ia_investigacion(+_url), creado_en`.

---

## 8. Variables de entorno (resumen)

Supabase (URL, anon, service role) · `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS` · GitHub App (`GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_ORG`) · GitHub OAuth del panel (`GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `PANEL_SESSION_SECRET`) · Slack (`SLACK_BOT_TOKEN`, `SLACK_BUG_CHANNEL`, `SLACK_SIGNING_SECRET`, `NEXT_PUBLIC_SLACK_TEAM_ID`) · IA (`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`). Referencia completa en `.env.example`.
