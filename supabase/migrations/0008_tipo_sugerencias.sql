-- Tipo de reporte (bug o sugerencia) y asignación (para el botón "Me la quedo" de Slack).
alter table public.reportes
  add column if not exists tipo text not null default 'bug',
  add column if not exists asignado_github text,
  add column if not exists asignado_slack text;

-- Índice para filtrar por tipo en el panel.
create index if not exists reportes_tipo_idx on public.reportes (tipo);
