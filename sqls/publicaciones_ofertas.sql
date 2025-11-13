-- =========================================
-- Script: publicaciones y ofertas con categorías predefinidas
-- Uso: Ejecutar en el SQL editor de Supabase
-- Requisitos: Tablas public.clientes y public.trabajadores existentes (id uuid references auth.users(id))
-- =========================================

-- Extensión para UUIDs (generalmente habilitada en Supabase)
create extension if not exists "pgcrypto";

-- =========================================
-- Enum de categorías más usadas + opción 'OTRO'
-- Si en el futuro deseas agregar más, usa:
--   alter type public.categoria_servicio add value 'NuevaCategoria';
-- =========================================
do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'categoria_servicio'
  ) then
    create type public.categoria_servicio as enum (
      'Electricidad',
      'Plomería',
      'Carpintería',
      'Albañilería',
      'Pintura',
      'Cerrajería',
      'Limpieza',
      'Jardinería',
      'Mudanzas',
      'Transporte',
      'Tecnología',
      'Reparación electrodomésticos',
      'Instalaciones',
      'Mantenimiento general',
      'Construcción',
      'Soldadura',
      'Tapicería',
      'Servicios domésticos',
      'OTRO'
    );
  end if;
end $$;

-- =========================================
-- TABLA: publicaciones
-- =========================================
create table if not exists public.publicaciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  titulo varchar(150) not null,
  descripcion text not null,
  categoria public.categoria_servicio not null,
  categoria_otro text null,
  ciudad varchar(100) not null,
  precio_maximo numeric(12,2) not null check (precio_maximo >= 0),
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, cliente_id),
  constraint chk_categoria_otro
    check (
      (categoria::text <> 'OTRO') or
      (categoria::text = 'OTRO' and categoria_otro is not null and length(btrim(categoria_otro)) >= 3)
    )
);

-- =========================================
-- TABLA: ofertas
-- =========================================
create table if not exists public.ofertas (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  trabajador_id uuid not null references public.trabajadores(id) on delete cascade,
  monto_oferta numeric(12,2) not null check (monto_oferta >= 0),
  mensaje text not null,
  estado varchar(20) not null default 'pendiente' check (estado in ('pendiente','aceptada','rechazada','retirada','finalizada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ofertas_publicacion_cliente_fk
    foreign key (publicacion_id, cliente_id)
    references public.publicaciones (id, cliente_id)
    on delete cascade
);

-- =========================================
-- ÍNDICES
-- =========================================
create index if not exists idx_publicaciones_cliente on public.publicaciones(cliente_id);
create index if not exists idx_publicaciones_ciudad on public.publicaciones(ciudad);
create index if not exists idx_publicaciones_activa on public.publicaciones(activa);
create index if not exists idx_publicaciones_categoria on public.publicaciones(categoria);

create index if not exists idx_ofertas_publicacion on public.ofertas(publicacion_id);
create index if not exists idx_ofertas_trabajador on public.ofertas(trabajador_id);
create index if not exists idx_ofertas_estado on public.ofertas(estado);

-- =========================================
-- TRIGGER para updated_at
-- =========================================
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_publicaciones_updated_at on public.publicaciones;
create trigger update_publicaciones_updated_at
  before update on public.publicaciones
  for each row execute function public.update_updated_at_column();

drop trigger if exists update_ofertas_updated_at on public.ofertas;
create trigger update_ofertas_updated_at
  before update on public.ofertas
  for each row execute function public.update_updated_at_column();

-- =========================================
-- RLS: activar
-- =========================================
alter table public.publicaciones enable row level security;
alter table public.ofertas enable row level security;

-- =========================================
-- POLÍTICAS: publicaciones
-- =========================================
drop policy if exists "Clientes insertan publicaciones" on public.publicaciones;
create policy "Clientes insertan publicaciones" on public.publicaciones
  for insert
  with check (
    cliente_id = auth.uid()
    and exists (select 1 from public.clientes c where c.id = auth.uid())
  );

drop policy if exists "Clientes ven sus publicaciones" on public.publicaciones;
create policy "Clientes ven sus publicaciones" on public.publicaciones
  for select
  using (cliente_id = auth.uid());

drop policy if exists "Trabajadores ven publicaciones activas" on public.publicaciones;
create policy "Trabajadores ven publicaciones activas" on public.publicaciones
  for select
  using (
    activa = true
    and exists (select 1 from public.trabajadores t where t.id = auth.uid())
  );

drop policy if exists "Clientes actualizan publicaciones" on public.publicaciones;
create policy "Clientes actualizan publicaciones" on public.publicaciones
  for update
  using (cliente_id = auth.uid())
  with check (cliente_id = auth.uid());

drop policy if exists "Clientes eliminan publicaciones" on public.publicaciones;
create policy "Clientes eliminan publicaciones" on public.publicaciones
  for delete
  using (cliente_id = auth.uid());

-- =========================================
-- POLÍTICAS: ofertas
-- =========================================
drop policy if exists "Trabajadores insertan ofertas" on public.ofertas;
create policy "Trabajadores insertan ofertas" on public.ofertas
  for insert
  with check (
    trabajador_id = auth.uid()
    and exists (select 1 from public.trabajadores t where t.id = auth.uid())
    and exists (
      select 1 from public.publicaciones p
      where p.id = publicacion_id and p.activa = true
    )
  );

drop policy if exists "Trabajadores ven sus ofertas" on public.ofertas;
create policy "Trabajadores ven sus ofertas" on public.ofertas
  for select
  using (trabajador_id = auth.uid());

drop policy if exists "Clientes ven ofertas de sus publicaciones" on public.ofertas;
create policy "Clientes ven ofertas de sus publicaciones" on public.ofertas
  for select
  using (cliente_id = auth.uid());

drop policy if exists "Trabajadores actualizan sus ofertas" on public.ofertas;
create policy "Trabajadores actualizan sus ofertas" on public.ofertas
  for update
  using (trabajador_id = auth.uid())
  with check (trabajador_id = auth.uid());

drop policy if exists "Trabajadores eliminan sus ofertas" on public.ofertas;
create policy "Trabajadores eliminan sus ofertas" on public.ofertas
  for delete
  using (trabajador_id = auth.uid());
