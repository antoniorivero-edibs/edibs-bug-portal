-- Guardar el detalle del reporte para poder mostrarlo entero en el panel ("Ver todo").
alter table public.reportes
  add column if not exists descripcion text,
  add column if not exists adjuntos jsonb not null default '[]'::jsonb,
  add column if not exists navegador text,
  add column if not exists url_origen text,
  add column if not exists ia_triaje_url text,
  add column if not exists ia_investigacion_url text;
