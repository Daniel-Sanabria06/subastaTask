create or replace function public.obtener_estadisticas_trabajador_publica(
  trabajador_id uuid
)
returns table (
  promedio numeric,
  total integer
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(avg(estrellas)::numeric, 0) as promedio,
    coalesce(count(1), 0) as total
  from public.resenas_ofertas
  where trabajador_id = obtener_estadisticas_trabajador_publica.trabajador_id;
$$;

comment on function public.obtener_estadisticas_trabajador_publica(uuid)
  is 'Agregados públicos de reseñas por trabajador: promedio y total. Seguridad: definer.';

grant execute on function public.obtener_estadisticas_trabajador_publica(uuid) to anon, authenticated;
