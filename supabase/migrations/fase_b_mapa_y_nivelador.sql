-- Fase B: mapa público de parques y Nivelador (ya aplicada en Supabase).
create or replace function public.parques_mapa() returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_array(
    id, round(ST_Y(geom::geometry)::numeric, 6), round(ST_X(geom::geometry)::numeric, 6),
    categoria, aparatos, nombre)), '[]'::jsonb)
  from parques where estado <> 'oculto';
$$;

create or replace function public.parque_ficha(p_id uuid) returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('id', id, 'nombre', nombre, 'pais', pais, 'categoria', categoria,
    'aparatos', aparatos, 'aparatos_barra', aparatos_barra, 'fuente', fuente, 'fecha_fuente', fecha_fuente,
    'atribucion', atribucion, 'confirmaciones', confirmaciones, 'estado', estado,
    'lat', ST_Y(geom::geometry), 'lng', ST_X(geom::geometry))
  from parques where id = p_id and estado <> 'oculto';
$$;

grant execute on function public.parques_mapa() to anon, authenticated;
grant execute on function public.parque_ficha(uuid) to anon, authenticated;

create table if not exists public.nivelaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  metodo text not null default 'declarado' check (metodo in ('declarado','camara')),
  nivel text not null check (nivel in ('genesis','fenix','guerrero','maestro','titan')),
  subnivel text,
  entradas jsonb,
  resultado jsonb,
  creado_en timestamptz not null default now()
);
alter table public.nivelaciones enable row level security;
-- Políticas: el usuario lee e inserta las suyas; el entrenador vinculado (entrena_a, 'basico') las lee.
