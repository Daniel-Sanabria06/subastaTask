-- =============================================================
-- SETUP: Documentos de verificación de trabajadores + Storage
-- Ejecutar este script en el editor SQL de Supabase.
-- Crea tabla `documentos_trabajador` y políticas de RLS.
-- Define políticas para bucket de Storage `documentos`.
-- =============================================================

begin;

-- Tabla para documentos de verificación
create table if not exists public.documentos_trabajador (
  id uuid primary key default uuid_generate_v4(),
  trabajador_id uuid not null references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('identidad','experiencia','otro')),
  storage_path text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente','aprobado','rechazado')),
  comentario_admin text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabla de administradores (emails) para RLS
create table if not exists public.admins (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  enabled boolean not null default true,
  created_at timestamptz default now()
);

-- Índices
create index if not exists idx_documentos_trabajador_trabajador on public.documentos_trabajador(trabajador_id);
create index if not exists idx_documentos_trabajador_estado on public.documentos_trabajador(estado);

-- Trigger updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists documentos_trabajador_updated_at on public.documentos_trabajador;
create trigger documentos_trabajador_updated_at
  before update on public.documentos_trabajador
  for each row execute function public.update_updated_at_column();

-- Habilitar RLS
alter table public.documentos_trabajador enable row level security;

-- Políticas RLS: 
-- - Los trabajadores pueden insertar y ver sus propios documentos
-- - Los administradores (por correo configurado) pueden ver y actualizar todos

-- Helper: función para determinar si el usuario es administrador por correo
create or replace function public.es_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_es_admin boolean := false;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    return false;
  end if;
  select exists(
    select 1 from public.admins a
    where lower(a.email) = lower(v_email)
      and a.enabled = true
  ) into v_es_admin;
  return coalesce(v_es_admin, false);
end;
$$;

drop policy if exists "Trabajador inserta sus documentos" on public.documentos_trabajador;
create policy "Trabajador inserta sus documentos" on public.documentos_trabajador
  for insert to authenticated
  with check (trabajador_id = auth.uid());

drop policy if exists "Trabajador ve sus documentos" on public.documentos_trabajador;
create policy "Trabajador ve sus documentos" on public.documentos_trabajador
  for select to authenticated
  using (trabajador_id = auth.uid());

drop policy if exists "Admin ve todos los documentos" on public.documentos_trabajador;
create policy "Admin ve todos los documentos" on public.documentos_trabajador
  for select to authenticated
  using (es_admin());

drop policy if exists "Admin actualiza estado documentos" on public.documentos_trabajador;
create policy "Admin actualiza estado documentos" on public.documentos_trabajador
  for update to authenticated
  using (es_admin())
  with check (true);

grant usage on schema public to authenticated, anon;
grant select, insert, update on public.documentos_trabajador to authenticated;
grant select on public.documentos_trabajador to anon; -- opcional, se puede remover si se desea más restricción

-- Políticas de Storage para bucket 'documentos'
-- Nota: crea el bucket 'documentos' en la UI de Storage si no existe.

drop policy if exists "Authenticated manage own documentos" on storage.objects;
create policy "Authenticated manage own documentos" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'documentos' and (owner = auth.uid())
  )
  with check (
    bucket_id = 'documentos' and (owner = auth.uid())
  );

drop policy if exists "Admin read documentos" on storage.objects;
create policy "Admin read documentos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documentos' and public.es_admin()
  );

commit;

-- Sugerencias:
-- - Ajustar función es_admin() para usar una tabla de administradores o extensión
-- - Generar URLs firmadas (signed URLs) para mostrar PDFs en la app
-- - Refrescar caché de esquema en Settings → API → Refresh

