-- El portal ya no usa Supabase Auth: las subidas se hacen con URLs firmadas por el servidor
-- (service role), que no dependen de RLS. Quitamos la policy de subida autenticada.
-- La lectura pública se mantiene (para incrustar imágenes en el issue).
drop policy if exists "adjuntos: subir autenticados" on storage.objects;
