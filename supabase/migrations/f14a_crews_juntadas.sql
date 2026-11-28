-- Fase 1.4 · Parte A: Crews con integrantes, juntadas con aforo y feed de Crews (28/11/2026)
-- Aplicada en Supabase como «f14a_crews_juntadas». La base es la fuente de verdad.
-- Regla: toda tabla nueva necesita política RLS Y grant select to authenticated.

-- 1) Crews: nivel que ayudan, objetivo y si entra quien quiera o por solicitud
alter table public.agrupaciones
  add column if not exists niveles text[] not null default '{}',
  add column if not exists objetivo text,
  add column if not exists abierto boolean not null default true;
alter table public.agrupaciones drop constraint if exists agrupaciones_niveles_ok;
alter table public.agrupaciones add constraint agrupaciones_niveles_ok check (niveles <@ array['genesis','fenix','guerrero','maestro','titan']::text[]);
alter table public.agrupaciones drop constraint if exists agrupaciones_objetivo_ok;
alter table public.agrupaciones add constraint agrupaciones_objetivo_ok check (objetivo is null or objetivo in ('fuerza','habilidades','salud','masa_muscular','bajar_grasa','movilidad'));

create table if not exists public.agrupacion_miembros (
  agrupacion_id uuid not null references public.agrupaciones(id) on delete cascade,
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  rol text not null default 'miembro' check (rol in ('dueno','miembro')),
  estado text not null default 'activo' check (estado in ('solicitud','activo')),
  creado_en timestamptz not null default now(),
  primary key (agrupacion_id, usuario_id)
);
create index if not exists agrupacion_miembros_usuario on public.agrupacion_miembros (usuario_id);
alter table public.agrupacion_miembros enable row level security;
drop policy if exists "mi membresia" on public.agrupacion_miembros;
create policy "mi membresia" on public.agrupacion_miembros for select using (usuario_id = (select auth.uid()));
grant select on table public.agrupacion_miembros to authenticated;
revoke all on table public.agrupacion_miembros from anon;

insert into public.agrupacion_miembros (agrupacion_id, usuario_id, rol, estado)
select id, creador_id, 'dueno', 'activo' from public.agrupaciones on conflict do nothing;

alter table public.publicaciones add column if not exists agrupacion_id uuid references public.agrupaciones(id) on delete cascade;
create index if not exists publicaciones_crew on public.publicaciones (agrupacion_id, creado_en desc) where agrupacion_id is not null;

-- Juntadas: aforo
alter table public.eventos add column if not exists cupo int;
alter table public.eventos drop constraint if exists eventos_cupo_ok;
alter table public.eventos add constraint eventos_cupo_ok check (cupo is null or cupo between 2 and 500);

-- 2) Ayudas internas
create or replace function interno.es_miembro(u uuid, crew uuid) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from agrupacion_miembros where agrupacion_id = crew and usuario_id = u and estado = 'activo');
$$;

-- puede_ver: una publicación de Crew la ven solo sus integrantes
create or replace function interno.puede_ver(yo uuid, p_tipo text, p_id uuid) returns boolean
language plpgsql stable security definer set search_path to 'public' as $$
declare dueno uuid; v_oculta boolean := false; comp text; v_crew uuid;
begin
  if p_tipo = 'publicacion' then
    select autor_id, oculta, agrupacion_id into dueno, v_oculta, v_crew from publicaciones where id = p_id;
  elsif p_tipo = 'logro' then
    select usuario_id into dueno from logros where id = p_id;
  else
    return false;
  end if;
  if dueno is null then return false; end if;
  if dueno = yo then return true; end if;
  if v_oculta or interno.hay_bloqueo(yo, dueno) then return false; end if;
  if v_crew is not null then return interno.es_miembro(yo, v_crew); end if;
  if not interno.son_amigos(yo, dueno) then return false; end if;
  select compartir_logros into comp from profiles where id = dueno;
  return p_tipo = 'publicacion' or comp <> 'nadie';
end $$;

-- 3) Crews
create or replace function public.crear_crew(p_tipo text, p_nombre text, p_descripcion text, p_ciudad text, p_pais text, p_lugar text,
  p_contacto text, p_niveles text[], p_objetivo text, p_abierto boolean) returns uuid
language plpgsql security definer set search_path to 'public' as $$
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
  insert into agrupaciones (creador_id, tipo, nombre, descripcion, ciudad, pais, lugar, contacto_url, niveles, objetivo, abierto)
  values (yo, p_tipo, btrim(p_nombre), nullif(btrim(coalesce(p_descripcion, '')), ''), btrim(p_ciudad), upper(p_pais),
          nullif(btrim(coalesce(p_lugar, '')), ''), c, coalesce(p_niveles, '{}'), nullif(p_objetivo, ''), coalesce(p_abierto, true))
  returning id into nuevo;
  insert into agrupacion_miembros (agrupacion_id, usuario_id, rol, estado) values (nuevo, yo, 'dueno', 'activo');
  return nuevo;
end $$;

-- La función vieja pasa por la nueva (así toda agrupación tiene su dueño como integrante)
create or replace function public.crear_agrupacion(p_tipo text, p_nombre text, p_descripcion text, p_ciudad text, p_pais text, p_lugar text, p_contacto text)
returns uuid language sql security definer set search_path to 'public' as $$
  select public.crear_crew(p_tipo, p_nombre, p_descripcion, p_ciudad, p_pais, p_lugar, p_contacto, '{}'::text[], null, true);
$$;

-- Crews de mi zona + las mías (estén donde estén)
create or replace function public.crews_zona() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); mi profiles%rowtype; lista jsonb;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  select * into mi from profiles where id = yo;
  select coalesce(jsonb_agg(x order by (x->>'es_mio') desc, x->>'nombre'), '[]'::jsonb) into lista from (
    select jsonb_build_object('id', g.id, 'tipo', g.tipo, 'nombre', g.nombre, 'descripcion', g.descripcion, 'ciudad', g.ciudad, 'pais', g.pais, 'lugar', g.lugar,
      'niveles', g.niveles, 'objetivo', g.objetivo, 'abierto', g.abierto,
      'miembros', (select count(*) from agrupacion_miembros m where m.agrupacion_id = g.id and m.estado = 'activo'),
      'estado', coalesce(me.estado, 'ninguno'), 'rol', me.rol, 'es_mio', (me.estado = 'activo'),
      'encaja', (cardinality(g.niveles) = 0 or mi.nivel = any(g.niveles))) as x
    from agrupaciones g
    left join agrupacion_miembros me on me.agrupacion_id = g.id and me.usuario_id = yo
    where g.estado = 'activa' and not interno.hay_bloqueo(yo, g.creador_id)
      and (me.usuario_id is not null or (mi.pais is not null and g.pais = mi.pais and (mi.ciudad is null or lower(g.ciudad) = lower(mi.ciudad))))
    limit 80) q;
  return jsonb_build_object('pais', mi.pais, 'ciudad', mi.ciudad, 'nivel', mi.nivel, 'crews', lista);
end $$;

create or replace function public.crew_detalle(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); g agrupaciones%rowtype; me agrupacion_miembros%rowtype; miembros jsonb := '[]'::jsonb; solic jsonb := '[]'::jsonb; ev jsonb;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  select * into g from agrupaciones where id = p_id and estado = 'activa';
  if not found or interno.hay_bloqueo(yo, g.creador_id) then return null; end if;
  select * into me from agrupacion_miembros where agrupacion_id = p_id and usuario_id = yo;
  if me.estado = 'activo' then
    select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'alias', p.alias, 'avatar_url', p.avatar_url, 'nivel', p.nivel, 'rol', m.rol) order by (m.rol = 'dueno') desc, p.alias), '[]'::jsonb)
      into miembros from agrupacion_miembros m join profiles p on p.id = m.usuario_id
      where m.agrupacion_id = p_id and m.estado = 'activo' and not interno.hay_bloqueo(yo, p.id);
  end if;
  if me.rol = 'dueno' then
    select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'alias', p.alias, 'avatar_url', p.avatar_url, 'nivel', p.nivel) order by m.creado_en), '[]'::jsonb)
      into solic from agrupacion_miembros m join profiles p on p.id = m.usuario_id where m.agrupacion_id = p_id and m.estado = 'solicitud';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', e.id, 'titulo', e.titulo, 'lugar', e.lugar, 'ciudad', e.ciudad, 'inicia_en', e.inicia_en, 'cupo', e.cupo,
      'voy', (select count(*) from asistencias a where a.evento_id = e.id),
      'yo_voy', exists (select 1 from asistencias a where a.evento_id = e.id and a.usuario_id = yo)) order by e.inicia_en), '[]'::jsonb)
    into ev from eventos e where e.agrupacion_id = p_id and e.estado = 'activo' and e.inicia_en > now() - interval '3 hours';
  return jsonb_build_object('id', g.id, 'tipo', g.tipo, 'nombre', g.nombre, 'descripcion', g.descripcion, 'ciudad', g.ciudad, 'pais', g.pais, 'lugar', g.lugar,
    'contacto_url', g.contacto_url, 'niveles', g.niveles, 'objetivo', g.objetivo, 'abierto', g.abierto,
    'total', (select count(*) from agrupacion_miembros m where m.agrupacion_id = p_id and m.estado = 'activo'),
    'estado', coalesce(me.estado, 'ninguno'), 'rol', me.rol, 'miembros', miembros, 'solicitudes', solic, 'eventos', ev);
end $$;

create or replace function public.unirse_crew(p_id uuid) returns text
language plpgsql security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); g agrupaciones%rowtype; n int; est text; alias_ text;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if not exists (select 1 from profiles where id = yo and onboarding_completo) then raise exception 'Completa tu perfil primero.'; end if;
  select * into g from agrupaciones where id = p_id and estado = 'activa';
  if not found or interno.hay_bloqueo(yo, g.creador_id) then raise exception 'Este Crew ya no está disponible.'; end if;
  if exists (select 1 from agrupacion_miembros where agrupacion_id = p_id and usuario_id = yo) then raise exception 'Ya formas parte o ya enviaste tu solicitud.'; end if;
  select count(*) into n from agrupacion_miembros where usuario_id = yo;
  if n >= 8 then raise exception 'Puedes estar en hasta 8 Crews a la vez.'; end if;
  select count(*) into n from agrupacion_miembros where agrupacion_id = p_id and estado = 'activo';
  if n >= 200 then raise exception 'Este Crew está completo.'; end if;
  est := case when g.abierto then 'activo' else 'solicitud' end;
  insert into agrupacion_miembros (agrupacion_id, usuario_id, rol, estado) values (p_id, yo, 'miembro', est);
  if est = 'solicitud' then
    select alias into alias_ from profiles where id = yo;
    insert into notificaciones (usuario_id, tipo, titulo, enlace, actor_id, datos)
    values (g.creador_id, 'crew_solicitud', 'Quieren unirse a tu Crew', '/panel/crews/' || g.id, yo, jsonb_build_object('alias', coalesce(alias_, ''), 'crew', g.nombre));
  end if;
  return est;
end $$;

create or replace function public.salir_crew(p_id uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then raise exception 'Entra a tu cuenta.'; end if;
  if exists (select 1 from agrupacion_miembros where agrupacion_id = p_id and usuario_id = auth.uid() and rol = 'dueno') then
    raise exception 'Eres quien creó este Crew: para dejarlo, bórralo.';
  end if;
  delete from agrupacion_miembros where agrupacion_id = p_id and usuario_id = auth.uid();
end $$;

create or replace function public.resolver_solicitud_crew(p_crew uuid, p_usuario uuid, p_aceptar boolean) returns void
language plpgsql security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); g agrupaciones%rowtype;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  select * into g from agrupaciones where id = p_crew and creador_id = yo and estado = 'activa';
  if not found then raise exception 'Solo quien creó el Crew puede resolver solicitudes.'; end if;
  if not exists (select 1 from agrupacion_miembros where agrupacion_id = p_crew and usuario_id = p_usuario and estado = 'solicitud') then return; end if;
  if p_aceptar then
    update agrupacion_miembros set estado = 'activo' where agrupacion_id = p_crew and usuario_id = p_usuario;
    insert into notificaciones (usuario_id, tipo, titulo, enlace, actor_id, datos)
    values (p_usuario, 'crew_aceptado', 'Te aceptaron en un Crew', '/panel/crews/' || p_crew, yo, jsonb_build_object('crew', g.nombre));
  else
    delete from agrupacion_miembros where agrupacion_id = p_crew and usuario_id = p_usuario;
  end if;
end $$;

create or replace function public.expulsar_de_crew(p_crew uuid, p_usuario uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if auth.uid() is null then raise exception 'Entra a tu cuenta.'; end if;
  if not exists (select 1 from agrupaciones where id = p_crew and creador_id = auth.uid()) then raise exception 'Solo quien creó el Crew puede quitar integrantes.'; end if;
  if p_usuario = auth.uid() then raise exception 'No puedes quitarte a ti mismo.'; end if;
  delete from agrupacion_miembros where agrupacion_id = p_crew and usuario_id = p_usuario;
end $$;

-- Crews de una persona, para su perfil (solo si comparte con amigos o es uno mismo)
create or replace function public.crews_de(p_alias text) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); p profiles%rowtype;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  select * into p from profiles where lower(alias) = lower(btrim(p_alias)) and onboarding_completo;
  if not found then return '[]'::jsonb; end if;
  if p.id <> yo and (interno.hay_bloqueo(yo, p.id) or not interno.son_amigos(yo, p.id) or p.compartir_logros = 'nadie') then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'nombre', g.nombre, 'tipo', g.tipo) order by g.nombre)
    from agrupacion_miembros m join agrupaciones g on g.id = m.agrupacion_id
    where m.usuario_id = p.id and m.estado = 'activo' and g.estado = 'activa'), '[]'::jsonb);
end $$;

-- 4) Publicar (con Crew opcional) y feed con pestaña «Crews»
drop function if exists public.publicar(text, text);
create or replace function public.publicar(p_texto text, p_enlace text default null, p_crew uuid default null) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); t text := btrim(coalesce(p_texto, '')); e text := nullif(btrim(coalesce(p_enlace, '')), ''); hoy int; nuevo uuid;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if char_length(t) < 1 or char_length(t) > 500 then raise exception 'Escribe entre 1 y 500 caracteres.'; end if;
  if e is not null and e !~* '^https://(www\.|m\.)?(youtube\.com|youtu\.be|facebook\.com|fb\.watch)/[^\s]*$' then
    raise exception 'Solo puedes compartir enlaces de YouTube o Facebook.';
  end if;
  if e is not null and char_length(e) > 300 then raise exception 'El enlace es demasiado largo.'; end if;
  if p_crew is not null and not interno.es_miembro(yo, p_crew) then raise exception 'Solo las personas del Crew pueden publicar ahí.'; end if;
  select count(*) into hoy from publicaciones where autor_id = yo and creado_en > now() - interval '1 day';
  if hoy >= 10 then raise exception 'Llegaste al máximo de 10 publicaciones por día. ¡Ve a entrenar!'; end if;
  insert into publicaciones (autor_id, texto, enlace, agrupacion_id) values (yo, t, e, p_crew) returning id into nuevo;
  return nuevo;
end $$;
revoke all on function public.publicar(text, text, uuid) from public, anon;
grant execute on function public.publicar(text, text, uuid) to authenticated;

create or replace function public.feed(p_pestana text) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); dias interval; r jsonb;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if p_pestana not in ('amigos','crews','mios') then raise exception 'Pestaña inválida.'; end if;
  dias := case when p_pestana = 'mios' then interval '90 days' when p_pestana = 'crews' then interval '30 days' else interval '14 days' end;
  with permitidos as (
    select yo as id
    union
    select case when solicitante_id = yo then destinatario_id else solicitante_id end
    from amistades where estado = 'aceptada' and yo in (solicitante_id, destinatario_id)
      and not interno.hay_bloqueo(yo, case when solicitante_id = yo then destinatario_id else solicitante_id end)
  ),
  mis_crews as (select agrupacion_id from agrupacion_miembros where usuario_id = yo and estado = 'activo'),
  items as (
    (select 'publicacion'::text as tipo, p.id, p.autor_id, p.texto as titulo, p.enlace, p.creado_en, p.agrupacion_id
     from publicaciones p
     where not p.oculta and p.creado_en > now() - dias
       and ((p_pestana = 'amigos' and p.agrupacion_id is null and p.autor_id in (select id from permitidos))
         or (p_pestana = 'mios' and p.autor_id = yo)
         or (p_pestana = 'crews' and p.agrupacion_id in (select agrupacion_id from mis_crews) and not interno.hay_bloqueo(yo, p.autor_id))))
    union all
    (select 'logro', l.id, l.usuario_id, l.titulo, null::text, l.creado_en, null::uuid
     from logros l join profiles pr on pr.id = l.usuario_id
     where p_pestana <> 'crews' and l.creado_en > now() - dias and (
       (p_pestana = 'mios' and l.usuario_id = yo)
       or (p_pestana = 'amigos' and l.usuario_id in (select id from permitidos) and (l.usuario_id = yo or pr.compartir_logros <> 'nadie'))))
  ),
  top as (select * from items order by creado_en desc limit 40)
  select coalesce(jsonb_agg(jsonb_build_object(
      'tipo', t.tipo, 'id', t.id, 'titulo', t.titulo, 'enlace', t.enlace, 'creado_en', t.creado_en, 'es_mio', t.autor_id = yo,
      'autor', jsonb_build_object('id', a.id, 'alias', a.alias, 'avatar_url', a.avatar_url, 'nivel', a.nivel),
      'crew', case when t.agrupacion_id is null then null else (select jsonb_build_object('id', g.id, 'nombre', g.nombre) from agrupaciones g where g.id = t.agrupacion_id) end,
      'reacciones', rx.n, 'yo_reaccione', rx.me) order by t.creado_en desc), '[]'::jsonb)
  into r
  from top t join profiles a on a.id = t.autor_id
  left join lateral (select count(*)::int as n, coalesce(bool_or(re.usuario_id = yo), false) as me from reacciones re where re.item_tipo = t.tipo and re.item_id = t.id) rx on true;
  return r;
end $$;

-- Publicaciones de un Crew (solo integrantes)
create or replace function public.feed_crew(p_crew uuid) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); r jsonb;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if not interno.es_miembro(yo, p_crew) then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'tipo', 'publicacion', 'id', p.id, 'titulo', p.texto, 'enlace', p.enlace, 'creado_en', p.creado_en, 'es_mio', p.autor_id = yo,
      'autor', jsonb_build_object('id', a.id, 'alias', a.alias, 'avatar_url', a.avatar_url, 'nivel', a.nivel),
      'crew', null::jsonb, 'reacciones', rx.n, 'yo_reaccione', rx.me) order by p.creado_en desc), '[]'::jsonb)
  into r
  from (select * from publicaciones where agrupacion_id = p_crew and not oculta order by creado_en desc limit 40) p
  join profiles a on a.id = p.autor_id
  left join lateral (select count(*)::int as n, coalesce(bool_or(re.usuario_id = yo), false) as me from reacciones re where re.item_tipo = 'publicacion' and re.item_id = p.id) rx on true
  where not interno.hay_bloqueo(yo, p.autor_id);
  return r;
end $$;

-- 5) Juntadas con aforo
create or replace function public.crear_juntada(p_titulo text, p_descripcion text, p_ciudad text, p_pais text, p_lugar text, p_inicia timestamptz,
  p_agrupacion uuid default null, p_cupo int default null) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); n int; nuevo uuid;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if not exists (select 1 from profiles where id = yo and onboarding_completo) then raise exception 'Completa tu perfil primero.'; end if;
  if char_length(btrim(coalesce(p_titulo, ''))) < 3 or char_length(btrim(p_titulo)) > 80 then raise exception 'El título debe tener entre 3 y 80 caracteres.'; end if;
  if char_length(btrim(coalesce(p_lugar, ''))) < 3 then raise exception 'Indica dónde será.'; end if;
  if char_length(btrim(coalesce(p_ciudad, ''))) < 2 then raise exception 'Indica la ciudad.'; end if;
  if p_pais !~ '^[A-Za-z]{2}$' then raise exception 'Indica el país.'; end if;
  if p_inicia is null or p_inicia < now() or p_inicia > now() + interval '120 days' then raise exception 'La fecha debe ser futura (hasta 120 días).'; end if;
  if p_cupo is not null and (p_cupo < 2 or p_cupo > 500) then raise exception 'El aforo debe estar entre 2 y 500 personas.'; end if;
  if p_agrupacion is not null and not exists (select 1 from agrupaciones where id = p_agrupacion and creador_id = yo and estado = 'activa') then
    raise exception 'Solo puedes organizar a nombre de tus agrupaciones.';
  end if;
  select count(*) into n from eventos where creador_id = yo and estado = 'activo' and inicia_en > now();
  if n >= 5 then raise exception 'Puedes tener hasta 5 juntadas próximas a la vez.'; end if;
  insert into eventos (creador_id, agrupacion_id, titulo, descripcion, ciudad, pais, lugar, inicia_en, cupo)
  values (yo, p_agrupacion, btrim(p_titulo), nullif(btrim(coalesce(p_descripcion, '')), ''), btrim(p_ciudad), upper(p_pais), btrim(p_lugar), p_inicia, p_cupo)
  returning id into nuevo;
  insert into asistencias (evento_id, usuario_id) values (nuevo, yo);
  return nuevo;
end $$;

create or replace function public.asistir(p_evento uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); n int; voy boolean; ev eventos%rowtype;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  select * into ev from eventos where id = p_evento and estado = 'activo' and inicia_en > now() - interval '3 hours';
  if not found then raise exception 'El evento ya no está disponible.'; end if;
  delete from asistencias where evento_id = p_evento and usuario_id = yo;
  if found then voy := false;
  else
    select count(*) into n from asistencias where evento_id = p_evento;
    if ev.cupo is not null and n >= ev.cupo then raise exception 'La juntada está completa.'; end if;
    insert into asistencias (evento_id, usuario_id) values (p_evento, yo); voy := true;
  end if;
  select count(*) into n from asistencias where evento_id = p_evento;
  return jsonb_build_object('voy', n, 'yo_voy', voy);
end $$;

-- Juntadas de mi zona (agrega aforo y Crew organizador)
create or replace function public.mi_zona() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); mi profiles%rowtype; ev jsonb; ag jsonb;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  select * into mi from profiles where id = yo;
  if mi.pais is null then return jsonb_build_object('requiere_ubicacion', true, 'eventos', '[]'::jsonb, 'agrupaciones', '[]'::jsonb); end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'titulo', e.titulo, 'descripcion', e.descripcion, 'ciudad', e.ciudad, 'lugar', e.lugar, 'inicia_en', e.inicia_en,
      'organiza', coalesce(g.nombre, '@' || o.alias), 'crew_id', g.id, 'es_mio', e.creador_id = yo, 'cupo', e.cupo,
      'voy', (select count(*) from asistencias a where a.evento_id = e.id),
      'yo_voy', exists (select 1 from asistencias a where a.evento_id = e.id and a.usuario_id = yo)) order by e.inicia_en), '[]'::jsonb)
  into ev
  from (select * from eventos where estado = 'activo' and inicia_en > now() - interval '3 hours' and inicia_en < now() + interval '120 days'
        and pais = mi.pais and (mi.ciudad is null or lower(ciudad) = lower(mi.ciudad)) and not interno.hay_bloqueo(yo, creador_id)
        order by inicia_en limit 30) e
  join profiles o on o.id = e.creador_id
  left join agrupaciones g on g.id = e.agrupacion_id and g.estado = 'activa';
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'tipo', g.tipo, 'nombre', g.nombre) order by g.nombre), '[]'::jsonb)
  into ag from agrupaciones g where g.creador_id = yo and g.estado = 'activa';
  return jsonb_build_object('requiere_ubicacion', false, 'pais', mi.pais, 'ciudad', mi.ciudad, 'eventos', ev, 'agrupaciones', ag);
end $$;

-- 6) Permisos
revoke all on function public.crear_crew(text,text,text,text,text,text,text,text[],text,boolean) from public, anon;
revoke all on function public.crews_zona() from public, anon;
revoke all on function public.crew_detalle(uuid) from public, anon;
revoke all on function public.unirse_crew(uuid) from public, anon;
revoke all on function public.salir_crew(uuid) from public, anon;
revoke all on function public.resolver_solicitud_crew(uuid, uuid, boolean) from public, anon;
revoke all on function public.expulsar_de_crew(uuid, uuid) from public, anon;
revoke all on function public.crews_de(text) from public, anon;
revoke all on function public.feed(text) from public, anon;
revoke all on function public.feed_crew(uuid) from public, anon;
revoke all on function public.crear_juntada(text,text,text,text,text,timestamptz,uuid,int) from public, anon;
revoke all on function public.asistir(uuid) from public, anon;
revoke all on function public.mi_zona() from public, anon;
revoke all on function public.crear_agrupacion(text,text,text,text,text,text,text) from public, anon;
grant execute on function public.crear_crew(text,text,text,text,text,text,text,text[],text,boolean) to authenticated;
grant execute on function public.crews_zona() to authenticated;
grant execute on function public.crew_detalle(uuid) to authenticated;
grant execute on function public.unirse_crew(uuid) to authenticated;
grant execute on function public.salir_crew(uuid) to authenticated;
grant execute on function public.resolver_solicitud_crew(uuid, uuid, boolean) to authenticated;
grant execute on function public.expulsar_de_crew(uuid, uuid) to authenticated;
grant execute on function public.crews_de(text) to authenticated;
grant execute on function public.feed(text) to authenticated;
grant execute on function public.feed_crew(uuid) to authenticated;
grant execute on function public.crear_juntada(text,text,text,text,text,timestamptz,uuid,int) to authenticated;
grant execute on function public.asistir(uuid) to authenticated;
grant execute on function public.mi_zona() to authenticated;
grant execute on function public.crear_agrupacion(text,text,text,text,text,text,text) to authenticated;
