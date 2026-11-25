-- Fase C2: «Mi zona» = eventos y agrupaciones (sin logros ajenos). YA APLICADA en Supabase.
-- Copia de referencia (instantánea tomada de la base el 2026-11-25). La base es la fuente de verdad.
-- Cambios extra aplicados en la misma migración (ver base): profiles.compartir_logros solo 'amigos'|'nadie';
-- reportar/admin_reportes/admin_resolver_reporte cubren publicacion/logro/evento/agrupacion (3 reportes ocultan);
-- feed() solo acepta 'amigos' y 'mios'.

create table agrupaciones (
  id uuid primary key default gen_random_uuid(),
  creador_id uuid not null references profiles(id) on delete cascade,
  tipo text not null check (tipo in ('familia','club','crew')),
  nombre text not null check (char_length(nombre) between 3 and 60),
  descripcion text check (descripcion is null or char_length(descripcion) <= 400),
  ciudad text not null check (char_length(ciudad) between 2 and 80),
  pais char(2) not null,
  lugar text check (lugar is null or char_length(lugar) <= 120),
  contacto_url text check (contacto_url is null or char_length(contacto_url) <= 200),
  estado text not null default 'activa' check (estado in ('activa','oculta')),
  creado_en timestamptz not null default now()
);
create table eventos (
  id uuid primary key default gen_random_uuid(),
  creador_id uuid not null references profiles(id) on delete cascade,
  agrupacion_id uuid references agrupaciones(id) on delete set null,
  titulo text not null check (char_length(titulo) between 3 and 80),
  descripcion text check (descripcion is null or char_length(descripcion) <= 500),
  ciudad text not null check (char_length(ciudad) between 2 and 80),
  pais char(2) not null,
  lugar text not null check (char_length(lugar) between 3 and 120),
  inicia_en timestamptz not null,
  estado text not null default 'activo' check (estado in ('activo','oculto')),
  creado_en timestamptz not null default now()
);
create table asistencias (
  evento_id uuid not null references eventos(id) on delete cascade,
  usuario_id uuid not null references profiles(id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (evento_id, usuario_id)
);
create index agrupaciones_zona on agrupaciones (pais, lower(ciudad)) where estado = 'activa';
create index eventos_zona on eventos (pais, lower(ciudad), inicia_en) where estado = 'activo';
alter table agrupaciones enable row level security;
alter table eventos enable row level security;
alter table asistencias enable row level security;
create policy "agrupaciones propias" on agrupaciones for select to authenticated using (creador_id = auth.uid());
create policy "eventos propios" on eventos for select to authenticated using (creador_id = auth.uid());
create policy "asistencias propias" on asistencias for select to authenticated using (usuario_id = auth.uid());

create or replace function public.mi_zona() returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); mi profiles%rowtype; ev jsonb; ag jsonb;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  select * into mi from profiles where id = yo;
  if mi.pais is null then return jsonb_build_object('requiere_ubicacion', true, 'eventos', '[]'::jsonb, 'agrupaciones', '[]'::jsonb); end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'titulo', e.titulo, 'descripcion', e.descripcion, 'ciudad', e.ciudad, 'lugar', e.lugar, 'inicia_en', e.inicia_en,
      'organiza', coalesce(g.nombre, '@' || o.alias), 'es_mio', e.creador_id = yo,
      'voy', (select count(*) from asistencias a where a.evento_id = e.id),
      'yo_voy', exists (select 1 from asistencias a where a.evento_id = e.id and a.usuario_id = yo)) order by e.inicia_en), '[]'::jsonb)
  into ev
  from (select * from eventos where estado = 'activo' and inicia_en > now() - interval '3 hours' and inicia_en < now() + interval '120 days'
        and pais = mi.pais and (mi.ciudad is null or lower(ciudad) = lower(mi.ciudad)) and not interno.hay_bloqueo(yo, creador_id)
        order by inicia_en limit 30) e
  join profiles o on o.id = e.creador_id
  left join agrupaciones g on g.id = e.agrupacion_id and g.estado = 'activa';
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', g.id, 'tipo', g.tipo, 'nombre', g.nombre, 'descripcion', g.descripcion, 'ciudad', g.ciudad, 'lugar', g.lugar,
      'contacto_url', g.contacto_url, 'es_mio', g.creador_id = yo) order by g.nombre), '[]'::jsonb)
  into ag
  from (select * from agrupaciones where estado = 'activa' and pais = mi.pais and (mi.ciudad is null or lower(ciudad) = lower(mi.ciudad))
        and not interno.hay_bloqueo(yo, creador_id) order by nombre limit 40) g;
  return jsonb_build_object('requiere_ubicacion', false, 'pais', mi.pais, 'ciudad', mi.ciudad, 'eventos', ev, 'agrupaciones', ag);
end $$;

create or replace function public.crear_agrupacion(p_tipo text, p_nombre text, p_descripcion text, p_ciudad text, p_pais text, p_lugar text, p_contacto text)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); n int; nuevo uuid; c text := nullif(btrim(coalesce(p_contacto, '')), '');
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if not exists (select 1 from profiles where id = yo and onboarding_completo) then raise exception 'Completa tu perfil primero.'; end if;
  if p_tipo not in ('familia','club','crew') then raise exception 'Elige familia, club o crew.'; end if;
  if char_length(btrim(coalesce(p_nombre, ''))) < 3 or char_length(btrim(p_nombre)) > 60 then raise exception 'El nombre debe tener entre 3 y 60 caracteres.'; end if;
  if char_length(btrim(coalesce(p_ciudad, ''))) < 2 then raise exception 'Indica la ciudad.'; end if;
  if p_pais !~ '^[A-Za-z]{2}$' then raise exception 'Indica el país.'; end if;
  if c is not null and not interno.enlace_permitido(c) then raise exception 'El contacto debe ser un enlace de Instagram, Facebook, YouTube, WhatsApp o Telegram.'; end if;
  select count(*) into n from agrupaciones where creador_id = yo and estado = 'activa';
  if n >= 3 then raise exception 'Puedes registrar hasta 3 agrupaciones.'; end if;
  insert into agrupaciones (creador_id, tipo, nombre, descripcion, ciudad, pais, lugar, contacto_url)
  values (yo, p_tipo, btrim(p_nombre), nullif(btrim(coalesce(p_descripcion, '')), ''), btrim(p_ciudad), upper(p_pais), nullif(btrim(coalesce(p_lugar, '')), ''), c)
  returning id into nuevo;
  return nuevo;
end $$;

create or replace function public.crear_evento(p_titulo text, p_descripcion text, p_ciudad text, p_pais text, p_lugar text, p_inicia timestamptz, p_agrupacion uuid default null)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); n int; nuevo uuid;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if not exists (select 1 from profiles where id = yo and onboarding_completo) then raise exception 'Completa tu perfil primero.'; end if;
  if char_length(btrim(coalesce(p_titulo, ''))) < 3 or char_length(btrim(p_titulo)) > 80 then raise exception 'El título debe tener entre 3 y 80 caracteres.'; end if;
  if char_length(btrim(coalesce(p_lugar, ''))) < 3 then raise exception 'Indica dónde será.'; end if;
  if char_length(btrim(coalesce(p_ciudad, ''))) < 2 then raise exception 'Indica la ciudad.'; end if;
  if p_pais !~ '^[A-Za-z]{2}$' then raise exception 'Indica el país.'; end if;
  if p_inicia is null or p_inicia < now() or p_inicia > now() + interval '120 days' then raise exception 'La fecha debe ser futura (hasta 120 días).'; end if;
  if p_agrupacion is not null and not exists (select 1 from agrupaciones where id = p_agrupacion and creador_id = yo and estado = 'activa') then
    raise exception 'Solo puedes organizar a nombre de tus agrupaciones.';
  end if;
  select count(*) into n from eventos where creador_id = yo and estado = 'activo' and inicia_en > now();
  if n >= 5 then raise exception 'Puedes tener hasta 5 eventos próximos a la vez.'; end if;
  insert into eventos (creador_id, agrupacion_id, titulo, descripcion, ciudad, pais, lugar, inicia_en)
  values (yo, p_agrupacion, btrim(p_titulo), nullif(btrim(coalesce(p_descripcion, '')), ''), btrim(p_ciudad), upper(p_pais), btrim(p_lugar), p_inicia)
  returning id into nuevo;
  return nuevo;
end $$;

create or replace function public.borrar_evento(p_id uuid) returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then raise exception 'Entra a tu cuenta.'; end if;
  delete from eventos where id = p_id and creador_id = auth.uid();
end $$;
create or replace function public.borrar_agrupacion(p_id uuid) returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then raise exception 'Entra a tu cuenta.'; end if;
  delete from agrupaciones where id = p_id and creador_id = auth.uid();
end $$;
create or replace function public.asistir(p_evento uuid) returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); n int; voy boolean;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if not exists (select 1 from eventos where id = p_evento and estado = 'activo' and inicia_en > now() - interval '3 hours') then raise exception 'El evento ya no está disponible.'; end if;
  delete from asistencias where evento_id = p_evento and usuario_id = yo;
  if found then voy := false; else insert into asistencias (evento_id, usuario_id) values (p_evento, yo); voy := true; end if;
  select count(*) into n from asistencias where evento_id = p_evento;
  return jsonb_build_object('voy', n, 'yo_voy', voy);
end $$;

-- Permisos: revocar de public/anon y conceder a authenticated en todas las funciones anteriores.
revoke execute on function public.mi_zona(), public.crear_agrupacion(text,text,text,text,text,text,text),
  public.crear_evento(text,text,text,text,text,timestamptz,uuid), public.borrar_evento(uuid), public.borrar_agrupacion(uuid), public.asistir(uuid) from public, anon;
grant execute on function public.mi_zona(), public.crear_agrupacion(text,text,text,text,text,text,text),
  public.crear_evento(text,text,text,text,text,timestamptz,uuid), public.borrar_evento(uuid), public.borrar_agrupacion(uuid), public.asistir(uuid) to authenticated;
