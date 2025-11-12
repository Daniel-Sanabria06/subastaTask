-- =============================================================
-- FULL SETUP: Reseñas de ofertas + Avatares en Storage
-- Ejecutar este script en el editor SQL de Supabase.
-- Incluye:
-- 1) Extensión uuid-ossp
-- 2) Constraint de estado en ofertas para incluir 'finalizada'
-- 3) Tabla resenas_ofertas con RLS, políticas y GRANTs
-- 4) Políticas de Storage para bucket 'fotosperfil' (lectura pública y gestión por dueño)
-- 5) Sugerencia: refrescar caché de esquema (Settings → API → Refresh)
-- =============================================================

begin;

-- 1) Extensión para uuid
create extension if not exists "uuid-ossp";

-- 2) Constraint de estado en ofertas
-- Permitimos 'pendiente', 'aceptada', 'rechazada', 'retirada', 'finalizada'
alter table if exists public.ofertas drop constraint if exists ofertas_estado_check;
alter table if exists public.ofertas
  add constraint ofertas_estado_check
  check (estado in ('pendiente','aceptada','rechazada','retirada','finalizada'));

-- 3) Tabla de reseñas de ofertas
create table if not exists public.resenas_ofertas (
  id uuid primary key default uuid_generate_v4(),
  oferta_id uuid not null references public.ofertas(id) on delete cascade,
  cliente_id uuid not null references auth.users(id) on delete cascade,
  trabajador_id uuid not null references auth.users(id) on delete cascade,
  estrellas integer not null check (estrellas >= 1 and estrellas <= 5),
  comentario text,
  created_at timestamp with time zone default now(),
  unique (oferta_id, cliente_id)
);

-- Índices
create index if not exists idx_resenas_oferta_id on public.resenas_ofertas(oferta_id);
create index if not exists idx_resenas_trabajador_id on public.resenas_ofertas(trabajador_id);

-- RLS
alter table public.resenas_ofertas enable row level security;

-- Políticas: idempotentes
drop policy if exists "Clientes crean reseña para su oferta" on public.resenas_ofertas;
create policy "Clientes crean reseña para su oferta" on public.resenas_ofertas
  for insert
  with check (
    auth.uid() = cliente_id and
    exists (
      select 1 from public.ofertas o
      where o.id = oferta_id
        and o.cliente_id = auth.uid()
        and o.estado = 'finalizada'
    )
  );

drop policy if exists "Participantes ven reseñas de su oferta" on public.resenas_ofertas;
create policy "Participantes ven reseñas de su oferta" on public.resenas_ofertas
  for select
  using (
    exists (
      select 1 from public.ofertas o
      where o.id = resenas_ofertas.oferta_id
        and (o.cliente_id = auth.uid() or o.trabajador_id = auth.uid())
    )
  );

drop policy if exists "Reseñas no editables" on public.resenas_ofertas;
create policy "Reseñas no editables" on public.resenas_ofertas
  for update to public
  using (false)
  with check (false);

drop policy if exists "Reseñas no eliminables" on public.resenas_ofertas;
create policy "Reseñas no eliminables" on public.resenas_ofertas
  for delete to public
  using (false);

-- GRANTs para que PostgREST descubra la tabla
grant usage on schema public to authenticated;
grant usage on schema public to anon;
grant select, insert on public.resenas_ofertas to authenticated;
grant select on public.resenas_ofertas to anon;

-- 4) Políticas de Storage para bucket 'fotosperfil'
-- Nota: el bucket debe existir. Si no está marcado como Public en la UI,
-- estas políticas permiten lectura pública y gestión por dueño.

drop policy if exists "Public read fotosperfil" on storage.objects;
create policy "Public read fotosperfil" on storage.objects
  for select to public
  using (bucket_id = 'fotosperfil');

drop policy if exists "Authenticated upload own avatar" on storage.objects;
create policy "Authenticated upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotosperfil' and owner = auth.uid());

drop policy if exists "Authenticated update own avatar" on storage.objects;
create policy "Authenticated update own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'fotosperfil' and owner = auth.uid())
  with check (bucket_id = 'fotosperfil' and owner = auth.uid());

drop policy if exists "Authenticated delete own avatar" on storage.objects;
create policy "Authenticated delete own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotosperfil' and owner = auth.uid());

commit;

-- 5) Sugerencias post-ejecución:
-- - En Supabase, ir a Settings → API → Refresh schema cache
-- - Verificar permisos:
--     select has_table_privilege('authenticated','public.resenas_ofertas','select');
--     select has_table_privilege('authenticated','public.resenas_ofertas','insert');
-- - Validar constraint:
--     select conname, consrc from pg_constraint where conrelid = 'public.ofertas'::regclass and contype = 'c';