-- Fase D: check-in en parques + mapa de calor. YA APLICADA en Supabase.
-- Copia de referencia (instantánea de la base, 2026-11-25). La base es la fuente de verdad.
-- Tabla checkins: id bigint identity pk, parque_id uuid fk parques on delete cascade, usuario_id uuid, dia date default current_date,
--   creado_en timestamptz default now(); unique (parque_id, usuario_id, dia); índices (usuario_id, dia) y (dia).
-- RLS: policy "propio checkin" (auth.uid() = usuario_id); la escritura va SOLO por checkin() (sin grants de insert/update/delete a clientes).
-- Logros nuevos: tipo 'parques' (primer check-in / N parques distintos) y 'racha' (N días seguidos), creados por la base.

create or replace function interno.racha(u uuid, hasta date) returns integer language plpgsql stable security definer set search_path to 'public' as $$
declare n int := 0;
begin
  while n < 400 and exists (select 1 from checkins where usuario_id = u and dia = hasta - n) loop n := n + 1; end loop;
  return n;
end $$;

create or replace function public.checkin(p_parque uuid, p_lat double precision, p_lng double precision, p_zona text default 'UTC')
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); g geography; dist double precision; tz text := 'UTC'; hoy date; n int; nuevo bigint; r int; parques int;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if not exists (select 1 from profiles where id = yo and onboarding_completo) then raise exception 'Completa tu perfil primero.'; end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'No pudimos leer tu ubicación.'; end if;
  if p_zona is not null and exists (select 1 from pg_timezone_names where name = p_zona) then tz := p_zona; end if;
  select geom::geography into g from parques where id = p_parque and estado <> 'oculto';
  if g is null then raise exception 'No encontramos ese parque.'; end if;
  dist := st_distance(g, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography);
  if dist > 250 then
    raise exception 'Estás a unos % m del parque. Acércate (a menos de 250 m) para hacer check-in.', (round(dist / 10) * 10)::int;
  end if;
  hoy := (now() at time zone tz)::date;
  select count(*) into n from checkins where usuario_id = yo and dia = hoy;
  if n >= 3 and not exists (select 1 from checkins where usuario_id = yo and dia = hoy and parque_id = p_parque) then
    raise exception 'Máximo 3 parques distintos por día. ¡Ya entrenaste bastante!';
  end if;
  insert into checkins (parque_id, usuario_id, dia) values (p_parque, yo, hoy) on conflict do nothing returning id into nuevo;
  r := interno.racha(yo, hoy);
  select count(distinct parque_id) into parques from checkins where usuario_id = yo;
  return jsonb_build_object('nuevo', nuevo is not null, 'racha', r, 'parques', parques);
end $$;
-- (La creación de los logros 'parques'/'racha' vive en un trigger/función de la base: ver pg_get_functiondef en Supabase.)

create or replace function public.mi_constancia(p_zona text default 'UTC') returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); tz text := 'UTC'; hoy date; r int;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if p_zona is not null and exists (select 1 from pg_timezone_names where name = p_zona) then tz := p_zona; end if;
  hoy := (now() at time zone tz)::date;
  r := interno.racha(yo, hoy);
  if r = 0 then r := interno.racha(yo, hoy - 1); end if;
  return jsonb_build_object('total', (select count(*) from checkins where usuario_id = yo),
    'parques', (select count(distinct parque_id) from checkins where usuario_id = yo), 'racha', r,
    'hoy', exists (select 1 from checkins where usuario_id = yo and dia = hoy));
end $$;

create or replace function public.calor_parques() returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_array(parque_id, n30, ahora)), '[]'::jsonb)
  from (select parque_id, count(*) filter (where dia >= (now() at time zone 'UTC')::date - 30)::int as n30,
               count(*) filter (where creado_en > now() - interval '2 hours')::int as ahora
        from checkins where dia >= (now() at time zone 'UTC')::date - 30 group by parque_id) t;
$$;

create or replace function public.parque_actividad(p_id uuid) returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'n30', (select count(*) from checkins where parque_id = p_id and dia >= (now() at time zone 'UTC')::date - 30),
    'ahora', (select count(*) from checkins where parque_id = p_id and creado_en > now() - interval '2 hours'),
    'yo_hoy', coalesce(auth.uid() is not null and exists (select 1 from checkins where parque_id = p_id and usuario_id = auth.uid() and creado_en > now() - interval '24 hours'), false));
$$;

revoke execute on function public.checkin(uuid,double precision,double precision,text), public.mi_constancia(text) from public, anon;
grant execute on function public.checkin(uuid,double precision,double precision,text), public.mi_constancia(text) to authenticated;
grant execute on function public.calor_parques(), public.parque_actividad(uuid) to anon, authenticated;
