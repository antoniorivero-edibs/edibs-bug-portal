-- Más información por reporte para el panel: enlace al mensaje de Slack y estado del análisis IA.
alter table public.reportes
  add column if not exists slack_permalink text,
  add column if not exists ia_triaje boolean not null default false,
  add column if not exists ia_investigacion boolean not null default false;
