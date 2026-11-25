-- UniBars · Fase A: red social primero.
-- Cuenta general sin rol + páginas adicionales (entrenador, tienda, wellness),
-- vínculo entrenador-alumno como "seguir con estado", perfil de entrenamiento
-- con visibilidad controlada por la persona, e invitaciones por link/QR.

-- 1. Perfiles: el rol único desaparece; admin pasa a ser una marca del sistema.
alter table profiles
  add column es_admin boolean not null default false,
  add column nivel text check (nivel in ('genesis','fenix','guerrero','maestro','titan')),
  add column objetivo text check (objetivo in ('fuerza','habilidades','salud','masa_muscular','bajar_grasa','movilidad'));

update profiles set es_admin = true where rol_principal = 'super_admin';
grant update (nivel, objetivo) on profiles to authenticated;

create or replace function es_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and es_admin);
$$;

drop function if exists admin_cambiar_rol(uuid, app_rol);
drop function if exists completar_onboarding(app_rol, text, text, boolean);
drop function if exists perfiles_publicos(uuid[]);

create function completar_onboarding(p_alias text, p_nombre text, p_mayor boolean, p_nivel text default null, p_objetivo text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sesión requerida'; end if;
  if not coalesce(p_mayor, false) then raise exception 'UniBars es para mayores de 18 años'; end if;
  if exists (select 1 from profiles where id = auth.uid() and onboarding_completo) then
    raise exception 'Tu perfil ya está completo';
  end if;
  update profiles set alias = lower(trim(p_alias)), nombre = nullif(trim(p_nombre), ''),
         nivel = nullif(p_nivel, ''), objetivo = nullif(p_objetivo, ''),
         declara_mayor_edad = true, acepta_terminos_en = now(), onboarding_completo = true
  where id = auth.uid();
end $$;

create function perfiles_publicos(p_ids uuid[])
returns table(id uuid, alias text, avatar_url text, nivel text)
language sql stable security definer set search_path = public as $$
  select p.id, p.alias, p.avatar_url, p.nivel
  from profiles p
  where p.id = any(p_ids) and p.onboarding_completo and not p.modo_invisible
    and auth.uid() is not null;
$$;

-- 2. Páginas (perfiles adicionales, como las páginas de Facebook).
create type pagina_tipo as enum ('entrenador','tienda','wellness');

create table paginas (
  id uuid primary key default gen_random_uuid(),
  dueno_id uuid not null references profiles(id) on delete cascade,
  tipo pagina_tipo not null,
  nombre text not null check (char_length(trim(nombre)) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,70}$'),
  bio text check (char_length(bio) <= 600),
  ciudad text check (char_length(ciudad) <= 60),
  pais char(2),
  estado text not null default 'activa' check (estado in ('activa','pausada','revision','suspendida')),
  modalidades text[] not null default '{}' check (modalidades <@ array['presencial','distancia','grupo']),
  atiende_niveles text[] not null default '{}' check (atiende_niveles <@ array['genesis','fenix','guerrero','maestro','titan']),
  atiende_objetivos text[] not null default '{}' check (atiende_objetivos <@ array['fuerza','habilidades','salud','masa_muscular','bajar_grasa','movilidad']),
  especialidad text check (char_length(especialidad) <= 80),
  plan text not null default 'gratis' check (plan in ('gratis','pro')),
  cupo_gratis int not null default 10 check (cupo_gratis >= 0),
  creado_en timestamptz not null default now(),
  unique (dueno_id, tipo)
);
create index on paginas (tipo, estado);

alter table paginas enable row level security;
revoke all on paginas from anon, authenticated;
-- dueno_id no se expone: la página no revela la cuenta personal de su dueño.
grant select (id, tipo, nombre, slug, bio, ciudad, pais, estado, modalidades, atiende_niveles,
              atiende_objetivos, especialidad, plan, creado_en) on paginas to anon, authenticated;
grant update (nombre, bio, ciudad, pais, modalidades, atiende_niveles, atiende_objetivos, especialidad)
  on paginas to authenticated;

create function es_dueno_pagina(p_pagina uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from paginas where id = p_pagina and dueno_id = auth.uid());
$$;

create policy "paginas activas publicas" on paginas for select to anon using (estado = 'activa');
create policy "paginas visibles" on paginas for select to authenticated
  using (estado = 'activa' or dueno_id = auth.uid() or es_super_admin());
create policy "dueno edita pagina" on paginas for update to authenticated
  using (dueno_id = auth.uid() and estado <> 'suspendida') with check (dueno_id = auth.uid());

create function slug_unico(p_texto text, p_tabla text) returns text
language plpgsql security definer set search_path = public as $$
declare v_base text; v_slug text; v_existe boolean;
begin
  v_base := trim(both '-' from regexp_replace(translate(lower(p_texto),'áéíóúüñ','aeiouun'), '[^a-z0-9]+', '-', 'g'));
  if char_length(v_base) < 2 then v_base := 'pagina'; end if;
  v_base := left(v_base, 60);
  v_slug := v_base;
  loop
    execute format('select exists (select 1 from %I where slug = $1)', p_tabla) into v_existe using v_slug;
    exit when not v_existe;
    v_slug := v_base || '-' || substr(md5(random()::text), 1, 4);
  end loop;
  return v_slug;
end $$;
revoke execute on function slug_unico(text, text) from public, anon, authenticated;

create function crear_pagina(p_tipo pagina_tipo, p_nombre text, p_ciudad text default null,
                             p_pais text default null, p_especialidad text default null)
returns text language plpgsql security definer set search_path = public as $$
declare v_slug text;
begin
  if not exists (select 1 from profiles where id = auth.uid() and onboarding_completo) then
    raise exception 'Completa tu perfil primero';
  end if;
  if exists (select 1 from paginas where dueno_id = auth.uid() and tipo = p_tipo) then
    raise exception 'Ya tienes una página de este tipo';
  end if;
  v_slug := slug_unico(p_nombre, 'paginas');
  insert into paginas (dueno_id, tipo, nombre, slug, ciudad, pais, especialidad, estado)
  values (auth.uid(), p_tipo, trim(p_nombre), v_slug, nullif(trim(p_ciudad), ''),
          nullif(upper(trim(p_pais)), ''), nullif(trim(p_especialidad), ''),
          -- Wellness se muestra solo después de verificar credenciales.
          case when p_tipo = 'wellness' then 'revision' else 'activa' end);
  return v_slug;
end $$;

create function mis_paginas()
returns setof paginas language sql stable security definer set search_path = public as $$
  select * from paginas where dueno_id = auth.uid() order by creado_en;
$$;

create function pausar_pagina(p_id uuid, p_pausar boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update paginas set estado = case when p_pausar then 'pausada' else 'activa' end
  where id = p_id and dueno_id = auth.uid() and estado in ('activa','pausada');
  if not found then raise exception 'No puedes cambiar el estado de esta página'; end if;
end $$;

create function admin_estado_pagina(p_id uuid, p_estado text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not es_super_admin() then raise exception 'Solo la administración puede hacerlo'; end if;
  if p_estado not in ('activa','pausada','revision','suspendida') then raise exception 'Estado no válido'; end if;
  update paginas set estado = p_estado where id = p_id;
end $$;

-- 3. Escuelas: pertenecen a una página de entrenador. Staff = dueño y coaches.
alter table escuelas add column pagina_id uuid not null references paginas(id) on delete cascade;

create or replace function crear_escuela(p_nombre text, p_ciudad text, p_pais text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_pagina uuid;
begin
  select id into v_pagina from paginas where dueno_id = auth.uid() and tipo = 'entrenador' and estado = 'activa';
  if v_pagina is null then raise exception 'Necesitas una página de entrenador activa para crear una escuela'; end if;
  insert into escuelas (nombre, slug, ciudad, pais, dueno_id, pagina_id)
  values (trim(p_nombre), slug_unico(p_nombre, 'escuelas'), nullif(trim(p_ciudad), ''),
          nullif(upper(trim(p_pais)), ''), auth.uid(), v_pagina)
  returning id into v_id;
  insert into escuela_miembros (escuela_id, usuario_id, rol_en_escuela) values (v_id, auth.uid(), 'dueno');
  return v_id;
end $$;

-- Solicitudes quedan solo para que un entrenador se sume al equipo de otra escuela.
create or replace function pedir_unirse_escuela(p_escuela uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_dueno uuid; v_id uuid; v_alias text;
begin
  if not exists (select 1 from paginas where dueno_id = auth.uid() and tipo = 'entrenador' and estado = 'activa') then
    raise exception 'Solo los entrenadores pueden sumarse al equipo de una escuela';
  end if;
  select alias into v_alias from profiles where id = auth.uid();
  select dueno_id into v_dueno from escuelas where id = p_escuela and estado = 'activa';
  if v_dueno is null then raise exception 'La escuela no existe'; end if;
  if exists (select 1 from escuela_miembros where escuela_id = p_escuela and usuario_id = auth.uid()) then
    raise exception 'Ya eres parte de esta escuela';
  end if;
  begin
    insert into solicitudes (tipo, solicitante_id, escuela_id) values ('coach_a_escuela', auth.uid(), p_escuela) returning id into v_id;
  exception when unique_violation then
    raise exception 'Ya enviaste una solicitud a esta escuela';
  end;
  insert into notificaciones (usuario_id, tipo, titulo, cuerpo, enlace)
  values (v_dueno, 'solicitud_escuela', 'Un entrenador quiere sumarse a tu escuela',
          '@' || coalesce(v_alias, 'alguien') || ' quiere ser parte del equipo', '/panel/entrenador');
  return v_id;
end $$;

create or replace function resolver_solicitud(p_id uuid, p_aceptar boolean)
returns void language plpgsql security definer set search_path = public as $$
declare s solicitudes%rowtype; v_nombre text;
begin
  select * into s from solicitudes where id = p_id for update;
  if not found or s.estado <> 'pendiente' then raise exception 'Solicitud no disponible'; end if;
  select nombre into v_nombre from escuelas where id = s.escuela_id and dueno_id = auth.uid();
  if v_nombre is null then raise exception 'No tienes permiso para resolver esta solicitud'; end if;
  update solicitudes set estado = case when p_aceptar then 'aceptada' else 'rechazada' end,
         resuelto_en = now(), resuelto_por = auth.uid() where id = p_id;
  if p_aceptar then
    insert into escuela_miembros (escuela_id, usuario_id, rol_en_escuela) values (s.escuela_id, s.solicitante_id, 'coach')
    on conflict do nothing;
  end if;
  insert into notificaciones (usuario_id, tipo, titulo, cuerpo, enlace)
  values (s.solicitante_id, 'solicitud_resuelta',
          case when p_aceptar then 'Ya eres parte del equipo de ' || v_nombre else 'Tu solicitud a ' || v_nombre || ' no fue aceptada' end,
          null, '/panel/entrenador');
end $$;

-- 4. Vínculo entrenador/wellness ↔ persona (un "seguir" con estado).
create table vinculos (
  id uuid primary key default gen_random_uuid(),
  pagina_id uuid not null references paginas(id) on delete cascade,
  persona_id uuid not null references profiles(id) on delete cascade,
  escuela_id uuid references escuelas(id) on delete set null,
  estado text not null default 'solicitud' check (estado in ('solicitud','aceptado','rechazado','finalizado','cancelado')),
  origen text not null default 'solicitud' check (origen in ('solicitud','invitacion')),
  mensaje text check (char_length(mensaje) <= 500),
  comparte_medidas boolean not null default false,
  comparte_salud boolean not null default false,
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz
);
create unique index vinculo_activo_unico on vinculos (pagina_id, persona_id) where estado in ('solicitud','aceptado');
create index on vinculos (persona_id);
create index on vinculos (pagina_id, estado);

alter table vinculos enable row level security;
revoke all on vinculos from anon, authenticated;
grant select on vinculos to authenticated;
create policy "ver mis vinculos" on vinculos for select to authenticated
  using (persona_id = auth.uid() or es_dueno_pagina(pagina_id) or es_super_admin());

-- ¿El usuario actual (dueño de página) puede ver datos de esta persona?
create function entrena_a(p_persona uuid, p_alcance text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from vinculos v join paginas p on p.id = v.pagina_id
    where v.persona_id = p_persona and p.dueno_id = auth.uid()
      and v.estado in ('solicitud','aceptado')
      and (p_alcance = 'basico'
           or (p_alcance = 'medidas' and v.comparte_medidas)
           or (p_alcance = 'salud' and v.comparte_salud)));
$$;

create function avisar(p_usuario uuid, p_tipo text, p_titulo text, p_cuerpo text, p_enlace text) returns void
language sql security definer set search_path = public as $$
  insert into notificaciones (usuario_id, tipo, titulo, cuerpo, enlace) values (p_usuario, p_tipo, p_titulo, p_cuerpo, p_enlace);
$$;
revoke execute on function avisar(uuid, text, text, text, text) from public, anon, authenticated;

create function solicitar_vinculo(p_pagina uuid, p_mensaje text default null,
                                  p_comparte_medidas boolean default false, p_comparte_salud boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_pag paginas%rowtype; v_id uuid; v_alias text;
begin
  select alias into v_alias from profiles where id = auth.uid() and onboarding_completo;
  if v_alias is null then raise exception 'Completa tu perfil primero'; end if;
  select * into v_pag from paginas where id = p_pagina and estado = 'activa' and tipo in ('entrenador','wellness');
  if not found then raise exception 'Esta página no recibe solicitudes'; end if;
  if v_pag.dueno_id = auth.uid() then raise exception 'No puedes enviarte una solicitud a ti mismo'; end if;
  begin
    insert into vinculos (pagina_id, persona_id, mensaje, comparte_medidas, comparte_salud)
    values (p_pagina, auth.uid(), nullif(trim(p_mensaje), ''), coalesce(p_comparte_medidas, false), coalesce(p_comparte_salud, false))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Ya tienes una solicitud o un vínculo activo con esta página';
  end;
  perform avisar(v_pag.dueno_id, 'vinculo_solicitud', 'Nueva solicitud de entrenamiento',
                 '@' || v_alias || ' quiere entrenar contigo', '/panel/entrenador');
  return v_id;
end $$;

create function alumnos_activos(p_pagina uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from vinculos where pagina_id = p_pagina and estado = 'aceptado';
$$;

create function cupo_disponible(p_pagina uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p.plan = 'pro' or alumnos_activos(p.id) < p.cupo_gratis from paginas p where p.id = p_pagina;
$$;
revoke execute on function cupo_disponible(uuid) from public, anon, authenticated;

create function resolver_vinculo(p_id uuid, p_aceptar boolean, p_escuela uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare v vinculos%rowtype; v_pag paginas%rowtype;
begin
  select * into v from vinculos where id = p_id for update;
  if not found or v.estado <> 'solicitud' then raise exception 'Solicitud no disponible'; end if;
  select * into v_pag from paginas where id = v.pagina_id;
  if v_pag.dueno_id <> auth.uid() then raise exception 'No tienes permiso para resolver esta solicitud'; end if;
  if p_aceptar and not cupo_disponible(v.pagina_id) then
    raise exception 'Llegaste a tu cupo gratis de % alumnos. Con el plan Pro puedes sumar más.', v_pag.cupo_gratis;
  end if;
  if p_escuela is not null and not exists (select 1 from escuelas where id = p_escuela and pagina_id = v.pagina_id) then
    raise exception 'Esa escuela no es tuya';
  end if;
  update vinculos set estado = case when p_aceptar then 'aceptado' else 'rechazado' end,
         resuelto_en = now(), escuela_id = coalesce(p_escuela, escuela_id) where id = p_id;
  perform avisar(v.persona_id, 'vinculo_resuelto',
                 case when p_aceptar then '¡' || v_pag.nombre || ' aceptó entrenarte!' else v_pag.nombre || ' no puede tomarte por ahora' end,
                 case when p_aceptar then 'Ya pueden trabajar juntos.' else 'Puedes buscar otro entrenador cuando quieras.' end,
                 '/panel/comunidad');
end $$;

-- Cualquiera de los dos lados termina el vínculo; el acceso a los datos se cierra al instante.
create function terminar_vinculo(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v vinculos%rowtype; v_dueno uuid; v_nombre text;
begin
  select * into v from vinculos where id = p_id for update;
  if not found or v.estado not in ('solicitud','aceptado') then raise exception 'Vínculo no disponible'; end if;
  select dueno_id, nombre into v_dueno, v_nombre from paginas where id = v.pagina_id;
  if auth.uid() = v.persona_id then
    update vinculos set estado = case when v.estado = 'solicitud' then 'cancelado' else 'finalizado' end, resuelto_en = now() where id = p_id;
    if v.estado = 'aceptado' then
      perform avisar(v_dueno, 'vinculo_fin', 'Un alumno terminó el vínculo', null, '/panel/entrenador');
    end if;
  elsif auth.uid() = v_dueno and v.estado = 'aceptado' then
    update vinculos set estado = 'finalizado', resuelto_en = now() where id = p_id;
    perform avisar(v.persona_id, 'vinculo_fin', v_nombre || ' terminó el vínculo de entrenamiento', null, '/panel/comunidad');
  else
    raise exception 'No tienes permiso';
  end if;
end $$;

create function permisos_vinculo(p_id uuid, p_medidas boolean, p_salud boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  update vinculos set comparte_medidas = p_medidas, comparte_salud = p_salud
  where id = p_id and persona_id = auth.uid() and estado in ('solicitud','aceptado');
  if not found then raise exception 'Vínculo no disponible'; end if;
end $$;

-- 5. Perfil de entrenamiento (cada sección con su propia visibilidad).
create table perfil_medidas (
  usuario_id uuid primary key references profiles(id) on delete cascade,
  peso_kg numeric(5,1) check (peso_kg between 25 and 300),
  estatura_cm numeric(5,1) check (estatura_cm between 100 and 250),
  actualizado_en timestamptz not null default now()
);
create table perfil_salud (
  usuario_id uuid primary key references profiles(id) on delete cascade,
  lesiones text check (char_length(lesiones) <= 1000),
  notas text check (char_length(notas) <= 1000),
  actualizado_en timestamptz not null default now()
);
create table marcas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references profiles(id) on delete cascade,
  ejercicio text not null check (char_length(trim(ejercicio)) between 2 and 60),
  valor numeric(7,1) not null check (valor > 0 and valor < 100000),
  unidad text not null check (unidad in ('reps','seg','kg')),
  fecha date not null default current_date,
  creado_en timestamptz not null default now()
);
create index on marcas (usuario_id, fecha desc);

alter table perfil_medidas enable row level security;
alter table perfil_salud enable row level security;
alter table marcas enable row level security;
revoke all on perfil_medidas, perfil_salud, marcas from anon, authenticated;
grant select, insert, update, delete on perfil_medidas, perfil_salud, marcas to authenticated;

create policy "medidas propias" on perfil_medidas for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "medidas compartidas" on perfil_medidas for select to authenticated using (entrena_a(usuario_id, 'medidas'));
create policy "salud propia" on perfil_salud for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "salud compartida" on perfil_salud for select to authenticated using (entrena_a(usuario_id, 'salud'));
create policy "marcas propias" on marcas for all to authenticated using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
create policy "marcas para su entrenador" on marcas for select to authenticated using (entrena_a(usuario_id, 'basico'));

-- Tarjeta de solicitud: lo que el entrenador ve antes (y después) de aceptar.
create function tarjeta_vinculo(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v vinculos%rowtype; r jsonb; m perfil_medidas%rowtype; s perfil_salud%rowtype;
begin
  select * into v from vinculos where id = p_id;
  if not found or not (es_dueno_pagina(v.pagina_id) or v.persona_id = auth.uid()) then
    raise exception 'No tienes permiso';
  end if;
  select jsonb_build_object('alias', p.alias, 'avatar_url', p.avatar_url, 'nivel', p.nivel, 'objetivo', p.objetivo,
                            'ciudad', p.ciudad, 'pais', p.pais, 'bio', p.bio)
    into r from profiles p where p.id = v.persona_id;
  r := r || jsonb_build_object('estado', v.estado, 'origen', v.origen, 'mensaje', v.mensaje, 'creado_en', v.creado_en,
                               'comparte_medidas', v.comparte_medidas, 'comparte_salud', v.comparte_salud);
  if v.estado in ('solicitud','aceptado') then
    r := r || jsonb_build_object('marcas', coalesce((
      select jsonb_agg(jsonb_build_object('ejercicio', ejercicio, 'valor', valor, 'unidad', unidad, 'fecha', fecha) order by fecha desc)
      from (select * from marcas where usuario_id = v.persona_id order by fecha desc limit 30) x), '[]'::jsonb));
    if v.comparte_medidas then
      select * into m from perfil_medidas where usuario_id = v.persona_id;
      r := r || jsonb_build_object('peso_kg', m.peso_kg, 'estatura_cm', m.estatura_cm,
        'imc', case when m.peso_kg is not null and m.estatura_cm is not null
                    then round(m.peso_kg / power(m.estatura_cm / 100.0, 2), 1) end);
    end if;
    if v.comparte_salud then
      select * into s from perfil_salud where usuario_id = v.persona_id;
      r := r || jsonb_build_object('lesiones', s.lesiones, 'notas_salud', s.notas);
    end if;
  end if;
  return r;
end $$;

-- 6. Invitaciones por link/QR (la persona entra directo, sin que el entrenador la busque).
create table invitaciones (
  codigo text primary key default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  pagina_id uuid not null references paginas(id) on delete cascade,
  escuela_id uuid references escuelas(id) on delete cascade,
  activa boolean not null default true,
  usos int not null default 0,
  creado_en timestamptz not null default now()
);
alter table invitaciones enable row level security;
revoke all on invitaciones from anon, authenticated;
grant select on invitaciones to authenticated;
create policy "dueno ve sus invitaciones" on invitaciones for select to authenticated using (es_dueno_pagina(pagina_id));

create function crear_invitacion(p_pagina uuid, p_escuela uuid default null) returns text
language plpgsql security definer set search_path = public as $$
declare v_codigo text;
begin
  if not exists (select 1 from paginas where id = p_pagina and dueno_id = auth.uid() and tipo in ('entrenador','wellness')) then
    raise exception 'No tienes permiso';
  end if;
  if p_escuela is not null and not exists (select 1 from escuelas where id = p_escuela and pagina_id = p_pagina) then
    raise exception 'Esa escuela no es tuya';
  end if;
  insert into invitaciones (pagina_id, escuela_id) values (p_pagina, p_escuela) returning codigo into v_codigo;
  return v_codigo;
end $$;

create function desactivar_invitacion(p_codigo text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update invitaciones set activa = false where codigo = p_codigo and es_dueno_pagina(pagina_id);
  if not found then raise exception 'No tienes permiso'; end if;
end $$;

-- Vista previa pública de una invitación (no revela datos personales).
create function ver_invitacion(p_codigo text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('pagina', p.nombre, 'slug', p.slug, 'tipo', p.tipo, 'ciudad', p.ciudad, 'pais', p.pais,
                            'escuela', e.nombre)
  from invitaciones i join paginas p on p.id = i.pagina_id left join escuelas e on e.id = i.escuela_id
  where i.codigo = p_codigo and i.activa and p.estado = 'activa';
$$;

create function usar_invitacion(p_codigo text, p_comparte_medidas boolean default false, p_comparte_salud boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare i invitaciones%rowtype; v_pag paginas%rowtype; v_alias text; v_estado text;
begin
  select alias into v_alias from profiles where id = auth.uid() and onboarding_completo;
  if v_alias is null then raise exception 'Completa tu perfil primero'; end if;
  select * into i from invitaciones where codigo = p_codigo and activa for update;
  if not found then raise exception 'Esta invitación ya no está disponible'; end if;
  select * into v_pag from paginas where id = i.pagina_id and estado = 'activa';
  if not found then raise exception 'Esta invitación ya no está disponible'; end if;
  if v_pag.dueno_id = auth.uid() then raise exception 'Es tu propia invitación'; end if;
  -- Si el entrenador no tiene cupo, la persona queda como solicitud pendiente (no se pierde).
  v_estado := case when cupo_disponible(v_pag.id) then 'aceptado' else 'solicitud' end;
  begin
    insert into vinculos (pagina_id, persona_id, escuela_id, estado, origen, comparte_medidas, comparte_salud, resuelto_en)
    values (v_pag.id, auth.uid(), i.escuela_id, v_estado, 'invitacion', coalesce(p_comparte_medidas, false),
            coalesce(p_comparte_salud, false), case when v_estado = 'aceptado' then now() end);
  exception when unique_violation then
    raise exception 'Ya tienes un vínculo activo con %', v_pag.nombre;
  end;
  update invitaciones set usos = usos + 1 where codigo = p_codigo;
  perform avisar(v_pag.dueno_id, 'vinculo_invitacion',
                 case when v_estado = 'aceptado' then '@' || v_alias || ' se unió con tu invitación'
                      else '@' || v_alias || ' quiere unirse, pero llegaste a tu cupo gratis' end,
                 null, '/panel/entrenador');
  return v_estado;
end $$;

-- 7. Limpieza del modelo viejo de roles.
alter table profiles drop column rol_principal;
drop type app_rol;

-- 8. Permisos de ejecución: nada para anon salvo lo público.
do $$
declare f text;
begin
  foreach f in array array[
    'completar_onboarding(text,text,boolean,text,text)', 'perfiles_publicos(uuid[])', 'es_dueno_pagina(uuid)',
    'crear_pagina(pagina_tipo,text,text,text,text)', 'mis_paginas()', 'pausar_pagina(uuid,boolean)',
    'admin_estado_pagina(uuid,text)', 'entrena_a(uuid,text)', 'solicitar_vinculo(uuid,text,boolean,boolean)',
    'alumnos_activos(uuid)', 'resolver_vinculo(uuid,boolean,uuid)', 'terminar_vinculo(uuid)',
    'permisos_vinculo(uuid,boolean,boolean)', 'tarjeta_vinculo(uuid)', 'crear_invitacion(uuid,uuid)',
    'desactivar_invitacion(text)', 'usar_invitacion(text,boolean,boolean)', 'ver_invitacion(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
grant execute on function ver_invitacion(text) to anon;
