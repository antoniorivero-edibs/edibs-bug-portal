-- Lista curada de productos reportables, gobernada desde la DB (no por topic de GitHub).
-- Oculto por defecto: un repo solo aparece en el portal si visible = true.
create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  repo text not null unique,
  alias text,
  descripcion text,
  visible boolean not null default false,
  orden integer not null default 100,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create index if not exists productos_visible_idx on public.productos (visible, orden);

-- RLS: solo el service role (rutas de servidor y panel) accede.
alter table public.productos enable row level security;

-- Semilla: Metriks visible; Vértice registrado pero oculto (como pediste).
insert into public.productos (repo, alias, descripcion, visible, orden) values
  ('metrik-wiz-stars', 'Metriks', null, true, 10),
  ('vertice-brandeador', 'Vértice Brandeador', 'Herramienta interna de Vertice para re-brandear material educativo.', false, 20)
on conflict (repo) do nothing;
