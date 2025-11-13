-- Políticas de Storage para el bucket 'fotosperfil'
-- Hacen pública la lectura y permiten a usuarios autenticados gestionar su propio avatar

-- Nota: aplicar estas políticas en Supabase si la UI del bucket no está marcada como Public

-- Lectura pública
create policy if not exists "Public read fotosperfil" on storage.objects
  for select to public
  using ( bucket_id = 'fotosperfil' );

-- Insertar por el dueño autenticado
create policy if not exists "Authenticated upload own avatar" on storage.objects
  for insert to authenticated
  with check ( bucket_id = 'fotosperfil' and owner = auth.uid() );

-- Actualizar por el dueño autenticado
create policy if not exists "Authenticated update own avatar" on storage.objects
  for update to authenticated
  using ( bucket_id = 'fotosperfil' and owner = auth.uid() )
  with check ( bucket_id = 'fotosperfil' and owner = auth.uid() );

-- Eliminar por el dueño autenticado
create policy if not exists "Authenticated delete own avatar" on storage.objects
  for delete to authenticated
  using ( bucket_id = 'fotosperfil' and owner = auth.uid() );

-- Recomendación: marcar el bucket 'fotosperfil' como Public desde la UI si se desea acceso anónimo