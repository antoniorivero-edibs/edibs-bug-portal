-- Bucket de adjuntos (capturas y vídeos de los reportes).
-- Público en lectura para que GitHub pueda incrustar las imágenes en el issue.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'adjuntos',
  'adjuntos',
  true,
  52428800, -- 50 MB
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Cualquier usuario autenticado (logueado en el portal) puede subir adjuntos.
create policy "adjuntos: subir autenticados"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'adjuntos');

-- Lectura pública (necesaria para incrustar imágenes por URL en el issue).
create policy "adjuntos: lectura publica"
  on storage.objects for select
  to public
  using (bucket_id = 'adjuntos');
