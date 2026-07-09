-- Tabla que mapea un issue de un producto con su mensaje de Slack.
-- Necesaria para actualizar el aviso (marcar resuelto) cuando el issue se cierra.
create table if not exists public.reportes (
  id uuid primary key default gen_random_uuid(),
  repo text not null,
  issue_number integer not null,
  issue_url text not null,
  titulo text not null,
  reporter_email text not null,
  slack_channel text,
  slack_ts text,
  estado text not null default 'abierto',
  creado_en timestamptz not null default now(),
  unique (repo, issue_number)
);

-- Índice para la búsqueda del webhook (repo + issue).
create index if not exists reportes_repo_issue_idx on public.reportes (repo, issue_number);

-- RLS activado: solo el service role (rutas de servidor) escribe/lee esta tabla.
-- El cliente nunca accede directamente, así que no definimos políticas para anon/authenticated.
alter table public.reportes enable row level security;
