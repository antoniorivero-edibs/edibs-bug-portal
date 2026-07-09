# Flujo, estados y estructuras (referencia)

Referencia de todo lo que produce el portal: el flujo completo, los estados, cómo queda un issue en GitHub y todos los mensajes de Slack. Para revisión del equipo.

---

## 1. Flujo completo (de reporte a resuelto)

1. La persona entra al portal, se identifica (**nombre + correo**, validado por dominio; sin verificación).
2. Elige **producto** (los `visible=true` de la tabla `productos`) y rellena **título + descripción + adjuntos**.
3. Los adjuntos suben **directos a Supabase Storage** con URL firmada (bucket `adjuntos`, público en lectura).
4. `POST /api/report` (servidor):
   1. Valida sesión-de-dominio, producto y adjuntos.
   2. Crea el **issue en GitHub** (vía GitHub App) con cuerpo formateado y **asignado** a los devs.
   3. Aplica la label **`portal`** (la crea si no existe).
   4. Resuelve el **usuario de Slack del reporter** por su correo (`users.lookupByEmail`).
   5. Publica el **aviso en Slack** (`#bug-portal`) y abre un **hilo de seguimiento**.
   6. Guarda todo en la tabla **`reportes`** (mapeo issue ↔ Slack + detalle).
   7. **Responde al instante** al navegador (pantalla de gracias, sin enlaces internos).
5. **En segundo plano** (`after()`), si hay `ANTHROPIC_API_KEY`, Claude:
   1. **Triaje** (solo texto): comenta en el issue, aplica labels de categoría y lo vuelca al hilo de Slack.
   2. **Investigación** (lee el repo): comenta en el issue (causa probable + ficheros candidatos) y lo vuelca al hilo.
6. Cuando el issue se **cierra/reabre** en GitHub → webhook → actualiza el aviso de Slack (Resuelto/Reabierto) y el estado en `reportes`, y lo anota en el hilo.

**Reparto de responsabilidades:** Slack = para que lo veáis las personas (aviso completo + hilo). GitHub issue = para el análisis técnico (dev + Claude Code).

---

## 2. Estados

| Cosa | Dónde | Valores |
| --- | --- | --- |
| Estado del bug | `reportes.estado` | `abierto` / `cerrado` (sincronizado por el webhook con GitHub) |
| Issue en GitHub | GitHub | `open` / `closed` (+ evento `reopened`) |
| Triaje IA | `reportes.ia_triaje` (+ `ia_triaje_url`) | `false` → `true` cuando Claude comenta |
| Investigación IA | `reportes.ia_investigacion` (+ `ia_investigacion_url`) | `false` → `true` cuando Claude comenta |
| Slack | `reportes.slack_ts` / `slack_permalink` | `null` si Slack no estaba configurado o falló; con valor si se avisó |
| Reporter en Slack | `reportes.reporter_slack_id` | ID (`U…`) si se encontró por correo; `null` si no |
| Producto | `productos.visible` | `true` (aparece en el portal) / `false` (oculto) |

En el panel, los chips de IA muestran: `✓` (hecho, con enlace al comentario), `pendiente` (IA activa pero aún no terminó) u `off` (sin `ANTHROPIC_API_KEY`).

---

## 3. GitHub

### 3.1 Cuerpo del issue

```markdown
## Descripción
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

### 3.2 Labels
- **`portal`**: se aplica siempre (creada automáticamente).
- **Categoría/área**: las decide Claude en el triaje (p. ej. `frontend`, `auth`, `datos`…). Se crean solas si no existen. Vocabulario base sugerido en `src/lib/products.ts` (`CATEGORIAS_SUGERIDAS`), pero Claude puede añadir otras.

### 3.3 Asignados
`antoniorivero-edibs` y `adominguez-edibs` (configurable en `src/lib/products.ts`).

### 3.4 Comentario 1 — Triaje (IA)
```markdown
## 🔎 Triaje automático

**Resumen:** …
**Qué ocurre:** …
**Severidad sugerida:** media — <justificación>
**Categoría / etiquetas:** frontend, datos

_Análisis automático (IA). La severidad es una sugerencia; el equipo decide al triar._
```

### 3.5 Comentario 2 — Investigación (IA)
```markdown
## 🧭 Investigación del código

**Causa probable:** …
**Ficheros / áreas candidatas:**
- [src/components/Dashboard.tsx](https://github.com/…/blob/HEAD/src/components/Dashboard.tsx) — …
**Para el dev:** …

_Análisis automático (IA) leyendo el repositorio. Puede contener errores; verifícalo antes de asumirlo._
```

### 3.6 Webhook consumido
Evento **`issues`**, acciones `closed` y `reopened` (el resto se ignoran). Firma validada con `GITHUB_WEBHOOK_SECRET`.

---

## 4. Slack

Canal: **`bug-portal`** (`SLACK_BUG_CHANNEL` = ID `C0BFWS9EPJN`).

### 4.1 Aviso principal (nuevo bug)
Bloques, en orden:
1. `:beetle: *Nuevo bug en <producto>*`
2. `*<título>*` + descripción (hasta ~2500 car.)
3. **Imágenes** incrustadas (bloques `image`, hasta 5)
4. (si hay vídeos) `:movie_camera: <url|nombre> · …`
5. `:bust_in_silhouette: Reporta <@reporter> (correo)`  ← línea propia
6. `<@dev1> <@dev2>`  ← menciones a los devs, línea aparte (sin "cc")
7. Botón **"Ver issue en GitHub"**

### 4.2 Hilo de seguimiento (respuesta al aviso)
Se abre automáticamente con:
```text
🧵 Seguimiento y actualizaciones — aquí se registran el estado y el análisis de la IA. Comentad lo que haga falta.
```
Dentro del hilo caen, según pasan:
- **Triaje de la IA** (contenido del comentario, convertido a formato Slack).
- **Investigación de la IA** (idem).
- Al cerrar: `✅ *Resuelto* (issue cerrado)`. Al reabrir: `🔄 *Reabierto*`.
- Vuestros mensajes/seguimiento manual.

### 4.3 Aviso al resolver/reabrir (edición del mensaje principal)
El mensaje principal se **edita** a una versión corta:
- Resuelto: `:white_check_mark: *Resuelto - <producto>*` + `<url|título>`
- Reabierto: vuelve a `:beetle: *Nuevo bug en <producto>*` + `<url|título>`

---

## 5. ¿Qué pasa si NO se encuentra al usuario en Slack?

`users.lookupByEmail` puede no encontrarlo (correo distinto al de Slack, invitado externo, o Slack sin configurar). En ese caso, **todo sigue funcionando**, solo cambia lo relativo a ese usuario:

| Efecto | Con Slack encontrado | Sin encontrar (`reporter_slack_id = null`) |
| --- | --- | --- |
| Aviso en Slack | Se publica igual | Se publica igual |
| "Reporta …" en el mensaje | Mención **@usuario** (clicable) | Solo el **nombre en negrita** (sin mención) |
| Menciones a los devs | Sí | Sí (son IDs fijos, no dependen del reporter) |
| "Escribir por Slack" en el panel | Aparece (DM directo) | **No aparece** (solo nombre + correo) |
| Issue, labels, IA, estado | Igual | Igual |

Es decir: no se rompe nada; simplemente se pierde el enlace/mención directa a esa persona en Slack. El correo siempre queda visible para contactarle por otra vía.

Si Slack no está configurado (`SLACK_BOT_TOKEN` ausente): no hay aviso ni hilo (`slack_* = null`), pero el issue se crea igual y el portal funciona.

---

## Tablas de datos (Supabase)

- **`productos`**: `repo, alias, descripcion, visible, orden`. Fuente de la lista del portal (curada desde el panel).
- **`reportes`**: `repo, issue_number, issue_url, titulo, estado, reporter_nombre, reporter_email, reporter_slack_id, descripcion, adjuntos(jsonb), navegador, url_origen, slack_channel, slack_ts, slack_permalink, ia_triaje(+_url), ia_investigacion(+_url), creado_en`.
