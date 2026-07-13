-- Avatar de Slack del asignado (URL pública de Slack, cacheada al asignar para no llamar a users.info en cada carga del panel).
alter table public.reportes
  add column if not exists asignado_slack_avatar text;
