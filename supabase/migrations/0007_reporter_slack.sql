-- Nombre del reporter y su usuario de Slack (para mostrar nombre y enlazar a su DM).
alter table public.reportes
  add column if not exists reporter_nombre text,
  add column if not exists reporter_slack_id text;
