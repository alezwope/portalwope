-- Fase 1.3 · Diario de progreso, árbol de habilidades y verificados gratis (28/11/2026)
-- Aplicada en Supabase como migración «f13a_progreso_verificados».
-- Reglas: el nivel SOLO lo decide el nivelador; las verificaciones nunca lo cambian ni lo bloquean.

-- 1) Árbol de habilidades (catálogo editable). Los nombres viven en los textos (hab.<clave>).
create table if not exists public.habilidades (
  clave text primary key,
  patron text not null check (patron in ('piernas','empuje','core','traccion','resistencia')),
  unidad text not null check (unidad in ('reps','seg')),
  ventana int,                -- 60 = «en 60 segundos» (sentadilla, burpees)
  orden int not null,
  campo_camara text,          -- clave de CAMARA en src/lib/nivelador.ts
  hitos jsonb not null default '[]'::jsonb   -- [{"nivel":"fenix","meta":15}, ...]
);
alter table public.habilidades enable row level security;
drop policy if exists "habilidades lectura" on public.habilidades;
create policy "habilidades lectura" on public.habilidades for select to authenticated using (true);

insert into public.habilidades (clave, patron, unidad, ventana, orden, campo_camara, hitos) values
  ('sentadilla',        'piernas', 'reps', 60,  10, 'piernas.reps',     '[{"nivel":"fenix","meta":15},{"nivel":"guerrero","meta":30}]'),
  ('silla',             'piernas', 'seg',  null,20, 'piernas.silla',    '[{"nivel":"fenix","meta":30},{"nivel":"guerrero","meta":60},{"nivel":"maestro","meta":120},{"nivel":"titan","meta":300}]'),
  ('pistol_asistido',   'piernas', 'reps', null,30, null,               '[{"nivel":"maestro","meta":1}]'),
  ('pistol',            'piernas', 'reps', null,40, 'piernas.pistolLibre','[{"nivel":"titan","meta":3}]'),
  ('flexion_pared',     'empuje',  'reps', null,10, 'empuje.pared',     '[{"nivel":"fenix","meta":15}]'),
  ('flexion_banco',     'empuje',  'reps', null,20, 'empuje.banco',     '[{"nivel":"fenix","meta":8}]'),
  ('flexion_piso',      'empuje',  'reps', null,30, 'empuje.piso',      '[{"nivel":"guerrero","meta":3},{"nivel":"maestro","meta":20}]'),
  ('fondos',            'empuje',  'reps', null,40, 'empuje.fondos',    '[{"nivel":"maestro","meta":3},{"nivel":"titan","meta":12}]'),
  ('pino_fuerza',       'empuje',  'reps', null,50, null,               '[{"nivel":"titan","meta":1}]'),
  ('pseudo_planche',    'empuje',  'seg',  null,60, null,               '[{"nivel":"titan","meta":5}]'),
  ('plancha',           'core',    'seg',  null,10, 'core.plancha',     '[{"nivel":"fenix","meta":20},{"nivel":"guerrero","meta":45},{"nivel":"maestro","meta":90}]'),
  ('hollow',            'core',    'seg',  null,20, 'core.hollow',      '[{"nivel":"maestro","meta":30}]'),
  ('lsit',              'core',    'seg',  null,30, null,               '[{"nivel":"titan","meta":15}]'),
  ('colgado',           'traccion','seg',  null,10, 'traccion.colgado', '[{"nivel":"fenix","meta":10},{"nivel":"guerrero","meta":30}]'),
  ('dominada_estatica', 'traccion','seg',  null,20, 'traccion.estatica','[{"nivel":"guerrero","meta":5}]'),
  ('dominadas',         'traccion','reps', null,30, 'traccion.dominadas','[{"nivel":"maestro","meta":1},{"nivel":"titan","meta":8}]'),
  ('muscle_up',         'traccion','reps', null,40, null,               '[{"nivel":"titan","meta":1}]'),
  ('front_lever_tuck',  'traccion','seg',  null,50, null,               '[{"nivel":"titan","meta":3}]'),
  ('burpee_medio',      'resistencia','reps',60,10,'resistencia.medios','[{"nivel":"fenix","meta":10}]'),
  ('burpee_flexion',    'resistencia','reps',60,20,'resistencia.conFlexion','[{"nivel":"guerrero","meta":8},{"nivel":"maestro","meta":20},{"nivel":"titan","meta":30}]')
on conflict (clave) do nothing;

-- 2) Diario: columnas nuevas en marcas
alter table public.marcas
  add column if not exists habilidad text references public.habilidades(clave),
  add column if not exists nota text,
  add column if not exists video_url text,
  add column if not exists metodo text not null default 'declarado',
  add column if not exists visibilidad text not null default 'amigos';
alter table public.marcas drop constraint if exists marcas_nota_largo;
alter table public.marcas add constraint marcas_nota_largo check (nota is null or char_length(nota) <= 200);
alter table public.marcas drop constraint if exists marcas_video_yt;
alter table public.marcas add constraint marcas_video_yt check (video_url is null or (video_url ~* '^https://(www\.|m\.)?(youtube\.com|youtu\.be)/[^\s]*$' and char_length(video_url) <= 300));
alter table public.marcas drop constraint if exists marcas_metodo_ok;
alter table public.marcas add constraint marcas_metodo_ok check (metodo in ('declarado','camara'));
alter table public.marcas drop constraint if exists marcas_visib_ok;
alter table public.marcas add constraint marcas_visib_ok check (visibilidad in ('privado','amigos','comunidad'));
alter table public.marcas drop constraint if exists marcas_comunidad_con_video;
alter table public.marcas add constraint marcas_comunidad_con_video check (visibilidad <> 'comunidad' or video_url is not null);
alter table public.marcas drop constraint if exists marcas_valor_rango;
alter table public.marcas add constraint marcas_valor_rango check (valor > 0 and valor <= 5000);
create index if not exists marcas_usuario_fecha on public.marcas (usuario_id, fecha desc);
create index if not exists marcas_habilidad on public.marcas (habilidad) where habilidad is not null;
create index if not exists marcas_comunidad on public.marcas (creado_en desc) where visibilidad = 'comunidad';

-- Una marca no se edita (así una verificación no queda pegada a un número cambiado): solo se crea o se borra.
drop policy if exists "marcas propias" on public.marcas;
drop policy if exists "marcas propias ver" on public.marcas;
drop policy if exists "marcas propias crear" on public.marcas;
drop policy if exists "marcas propias borrar" on public.marcas;
create policy "marcas propias ver" on public.marcas for select using (usuario_id = (select auth.uid()));
create policy "marcas propias crear" on public.marcas for insert with check (usuario_id = (select auth.uid()));
create policy "marcas propias borrar" on public.marcas for delete using (usuario_id = (select auth.uid()));

-- Meta semanal de días de entrenamiento (rachas semanales)
alter table public.profiles add column if not exists dias_semana smallint;
alter table public.profiles drop constraint if exists profiles_dias_semana_rango;
alter table public.profiles add constraint profiles_dias_semana_rango check (dias_semana is null or dias_semana between 1 and 7);

-- 3) Verificaciones
create table if not exists public.verificaciones (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas(id) on delete cascade,
  verificador_id uuid not null references public.profiles(id) on delete cascade,
  rol text not null check (rol in ('entrenador','comunidad')),
  valida boolean not null default true,
  era_amigo boolean not null default false,
  creado_en timestamptz not null default now(),
  unique (marca_id, verificador_id)
);
create index if not exists verificaciones_verificador on public.verificaciones (verificador_id, creado_en desc);
alter table public.verificaciones enable row level security;
drop policy if exists "verificaciones mias" on public.verificaciones;
drop policy if exists "verificaciones de mis marcas" on public.verificaciones;
create policy "verificaciones mias" on public.verificaciones for select using (verificador_id = (select auth.uid()));
create policy "verificaciones de mis marcas" on public.verificaciones for select
  using (exists (select 1 from public.marcas m where m.id = marca_id and m.usuario_id = (select auth.uid())));
-- (sin políticas de escritura: se verifica solo con public.verificar_marca)

-- 4) Ayudas internas
create or replace function interno.idx_nivel(n text) returns int language sql immutable as $$
  select case n when 'genesis' then 0 when 'fenix' then 1 when 'guerrero' then 2 when 'maestro' then 3 when 'titan' then 4 else null end;
$$;

-- Nivel (0-4) que muestra un valor en una habilidad: el mayor hito alcanzado (0 si ninguno o sin habilidad).
create or replace function interno.nivel_de_marca(p_habilidad text, p_valor numeric) returns int
language sql stable set search_path to 'public' as $$
  select coalesce(max(interno.idx_nivel(h->>'nivel')), 0)
  from public.habilidades s, jsonb_array_elements(s.hitos) h
  where s.clave = p_habilidad and p_valor >= (h->>'meta')::numeric;
$$;

create or replace function interno.es_semilla(u uuid) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.profiles where id = u and es_admin)
      or exists (select 1 from public.paginas where dueno_id = u and tipo::text = 'entrenador' and estado = 'activa');
$$;

-- Resumen de verificación de una marca (reglas ajustables aquí: 3 verificaciones válidas, al menos 1 sin amistad previa)
create or replace function interno.resumen_marca(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare v int; nv int; sa int; ent boolean; est text;
begin
  select count(*) filter (where valida), count(*) filter (where not valida),
         count(*) filter (where valida and not era_amigo), coalesce(bool_or(valida and rol = 'entrenador'), false)
    into v, nv, sa, ent from verificaciones where marca_id = p_id;
  est := case
    when ent then 'entrenador'
    when v >= 3 and sa >= 1 then 'comunidad'
    when nv >= 2 and nv >= v then 'en_duda'
    when v > 0 then 'en_proceso'
    else 'ninguna' end;
  return jsonb_build_object('estado', est, 'validas', v, 'no_validas', nv, 'sin_amistad', sa, 'entrenador', ent);
end $$;

create or replace function interno.puede_ver_marca(yo uuid, m public.marcas) returns boolean
language plpgsql stable security definer set search_path to 'public' as $$
declare p profiles%rowtype;
begin
  if m.usuario_id = yo then return true; end if;
  if m.visibilidad = 'privado' or interno.hay_bloqueo(yo, m.usuario_id) then return false; end if;
  select * into p from profiles where id = m.usuario_id;
  if p.modo_invisible and not interno.son_amigos(yo, m.usuario_id) then return false; end if;
  if m.visibilidad = 'comunidad' then return true; end if;
  return interno.son_amigos(yo, m.usuario_id) and p.compartir_logros <> 'nadie';
end $$;

-- 5) Disparadores de marcas
create or replace function interno.marcas_antes() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare hoy int;
begin
  if new.fecha > (now() at time zone 'utc')::date + 1 then raise exception 'La fecha no puede ser futura.'; end if;
  select count(*) into hoy from marcas where usuario_id = new.usuario_id and creado_en > now() - interval '1 day';
  if hoy >= 40 then raise exception 'Llegaste al máximo de 40 marcas por día. ¡Ve a entrenar!'; end if;
  new.nota := nullif(btrim(coalesce(new.nota, '')), '');
  return new;
end $$;
drop trigger if exists marcas_antes_insert on public.marcas;
create trigger marcas_antes_insert before insert on public.marcas for each row execute function interno.marcas_antes();

-- Un logro del feed solo si la marca no es privada
create or replace function interno.logro_por_marca() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare previo numeric; v_unidad text; ej text := lower(btrim(new.ejercicio)); v_valor text; etiqueta text; hoy_id uuid;
begin
  if new.visibilidad = 'privado' then return new; end if;
  v_unidad := case new.unidad when 'seg' then 'seg' when 'kg' then 'kg de lastre' else 'reps' end;
  v_valor := trim(trailing '.' from trim(trailing '0' from to_char(new.valor, 'FM999990.00'))) || ' ' || v_unidad;
  etiqueta := btrim(new.ejercicio);
  select max(valor) into previo from marcas where usuario_id = new.usuario_id and lower(btrim(ejercicio)) = ej and id <> new.id;
  if previo is null then
    insert into logros (usuario_id, tipo, clave, titulo)
    values (new.usuario_id, 'primera_marca', ej, 'Registró su primera marca en ' || etiqueta || ': ' || v_valor) on conflict do nothing;
  elsif new.valor > previo then
    select id into hoy_id from logros where usuario_id = new.usuario_id and tipo = 'record' and clave like ej || ':%' and creado_en::date = now()::date limit 1;
    if hoy_id is not null then
      update logros set titulo = 'Nuevo récord en ' || etiqueta || ': ' || v_valor, clave = ej || ':' || new.valor where id = hoy_id;
    else
      insert into logros (usuario_id, tipo, clave, titulo)
      values (new.usuario_id, 'record', ej || ':' || new.valor, 'Nuevo récord en ' || etiqueta || ': ' || v_valor) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;

-- Aviso al entrenador cuando su alumno rompe su propio récord (no por cada marca)
create or replace function interno.marcas_despues() returns trigger language plpgsql security definer set search_path to 'public' as $$
declare previo numeric; alias_ text; ej text := coalesce(new.habilidad, lower(btrim(new.ejercicio)));
begin
  select max(valor) into previo from marcas
   where usuario_id = new.usuario_id and id <> new.id
     and coalesce(habilidad, lower(btrim(ejercicio))) = ej;
  if previo is not null and new.valor <= previo then return new; end if;
  select alias into alias_ from profiles where id = new.usuario_id;
  insert into notificaciones (usuario_id, tipo, titulo, cuerpo, enlace, actor_id, datos)
  select distinct p.dueno_id, 'marca_alumno', 'Un alumno anotó un récord', coalesce(alias_, '') || ': ' || btrim(new.ejercicio) || ' ' || new.valor,
         '/panel/progreso/verificar', new.usuario_id,
         jsonb_build_object('alias', coalesce(alias_, ''), 'ejercicio', coalesce(new.habilidad, btrim(new.ejercicio)), 'valor', new.valor, 'unidad', new.unidad, 'marca', new.id)
  from vinculos v join paginas p on p.id = v.pagina_id
  where v.persona_id = new.usuario_id and v.estado in ('solicitud','aceptado') and p.tipo::text = 'entrenador';
  return new;
end $$;
drop trigger if exists marcas_aviso_entrenador on public.marcas;
create trigger marcas_aviso_entrenador after insert on public.marcas for each row execute function interno.marcas_despues();

-- 6) RPC públicas
create or replace function public.verificar_marca(p_marca uuid, p_valida boolean default true) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); m marcas%rowtype; rol_ text; mi int; req int; hoy int; semilla boolean; ya_antes boolean;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  select * into m from marcas where id = p_marca;
  if not found then raise exception 'La marca ya no existe.'; end if;
  if m.usuario_id = yo then raise exception 'No puedes verificar tus propias marcas.'; end if;
  if interno.hay_bloqueo(yo, m.usuario_id) then raise exception 'No disponible.'; end if;
  select count(*) into hoy from verificaciones where verificador_id = yo and creado_en > now() - interval '1 day';
  if hoy >= 30 then raise exception 'Llegaste al máximo de 30 verificaciones por día.'; end if;
  if m.visibilidad = 'privado' and not entrena_a(m.usuario_id, 'basico') then raise exception 'Esta marca no está abierta a verificación.'; end if;
  if entrena_a(m.usuario_id, 'basico') then
    rol_ := 'entrenador';
  else
    if m.visibilidad <> 'comunidad' or m.video_url is null then raise exception 'Esta marca no está abierta a verificación.'; end if;
    semilla := interno.es_semilla(yo);
    select interno.idx_nivel(nivel) into mi from profiles where id = yo;
    if mi is null and not semilla then raise exception 'Haz el nivelador para poder verificar.'; end if;
    if not semilla and (select creado_en from profiles where id = yo) > now() - interval '3 days' then
      raise exception 'Tu cuenta es muy nueva: podrás verificar en unos días.';
    end if;
    req := interno.nivel_de_marca(m.habilidad, m.valor);
    if not semilla and mi < req then raise exception 'Para verificar esta marca necesitas un nivel más alto.'; end if;
    rol_ := 'comunidad';
  end if;
  select exists (select 1 from verificaciones where marca_id = m.id and verificador_id = yo) into ya_antes;
  insert into verificaciones (marca_id, verificador_id, rol, valida, era_amigo)
  values (m.id, yo, rol_, coalesce(p_valida, true), interno.son_amigos(yo, m.usuario_id))
  on conflict (marca_id, verificador_id) do update set valida = excluded.valida, rol = excluded.rol, era_amigo = excluded.era_amigo, creado_en = now();
  if not ya_antes then
    insert into notificaciones (usuario_id, tipo, titulo, enlace, actor_id, datos)
    values (m.usuario_id, case when coalesce(p_valida, true) then 'marca_verificada' else 'marca_dudosa' end,
            case when coalesce(p_valida, true) then 'Verificaron una de tus marcas' else 'Alguien dudó de una de tus marcas' end,
            '/panel/progreso', yo,
            jsonb_build_object('marca', m.id, 'ejercicio', coalesce(m.habilidad, btrim(m.ejercicio)), 'valor', m.valor, 'unidad', m.unidad, 'rol', rol_));
  end if;
  return interno.resumen_marca(m.id);
end $$;

create or replace function public.retirar_verificacion(p_marca uuid) returns jsonb
language plpgsql security definer set search_path to 'public' as $$
declare yo uuid := auth.uid();
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  delete from verificaciones where marca_id = p_marca and verificador_id = yo;
  return interno.resumen_marca(p_marca);
end $$;

-- Mi diario: mis marcas con su estado de verificación y quiénes verificaron
create or replace function public.mi_diario(p_limite int default 200) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare yo uuid := auth.uid();
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  return coalesce((
    select jsonb_agg(x order by (x->>'fecha') desc, (x->>'creado_en') desc) from (
      select jsonb_build_object('id', m.id, 'ejercicio', m.ejercicio, 'habilidad', m.habilidad, 'valor', m.valor, 'unidad', m.unidad,
        'fecha', m.fecha, 'creado_en', m.creado_en, 'nota', m.nota, 'video_url', m.video_url, 'metodo', m.metodo, 'visibilidad', m.visibilidad,
        'verif', interno.resumen_marca(m.id),
        'verificadores', coalesce((select jsonb_agg(jsonb_build_object('alias', pr.alias, 'rol', v.rol, 'valida', v.valida) order by v.creado_en)
                                   from verificaciones v join profiles pr on pr.id = v.verificador_id where v.marca_id = m.id), '[]'::jsonb)) as x
      from marcas m where m.usuario_id = yo order by m.fecha desc, m.creado_en desc limit greatest(1, least(coalesce(p_limite, 200), 500))
    ) q), '[]'::jsonb);
end $$;

-- Cola de verificación: marcas de mis alumnos + marcas abiertas de la comunidad que puedo verificar
create or replace function public.para_verificar() returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); mi int; semilla boolean; al jsonb; co jsonb;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  semilla := interno.es_semilla(yo);
  select interno.idx_nivel(nivel) into mi from profiles where id = yo;
  select coalesce(jsonb_agg(x order by (x->>'creado_en') desc), '[]'::jsonb) into al from (
    select jsonb_build_object('id', m.id, 'ejercicio', m.ejercicio, 'habilidad', m.habilidad, 'valor', m.valor, 'unidad', m.unidad, 'fecha', m.fecha,
      'creado_en', m.creado_en, 'nota', m.nota, 'video_url', m.video_url, 'metodo', m.metodo,
      'autor', jsonb_build_object('id', a.id, 'alias', a.alias, 'avatar_url', a.avatar_url, 'nivel', a.nivel),
      'verif', interno.resumen_marca(m.id),
      'yo', (select jsonb_build_object('valida', v.valida) from verificaciones v where v.marca_id = m.id and v.verificador_id = yo)) as x
    from marcas m join profiles a on a.id = m.usuario_id
    where m.usuario_id <> yo and m.creado_en > now() - interval '90 days'
      and exists (select 1 from vinculos vi join paginas p on p.id = vi.pagina_id
                  where vi.persona_id = m.usuario_id and p.dueno_id = yo and vi.estado in ('solicitud','aceptado'))
    order by m.creado_en desc limit 40) q;
  select coalesce(jsonb_agg(x), '[]'::jsonb) into co from (
    select jsonb_build_object('id', m.id, 'ejercicio', m.ejercicio, 'habilidad', m.habilidad, 'valor', m.valor, 'unidad', m.unidad, 'fecha', m.fecha,
      'creado_en', m.creado_en, 'nota', m.nota, 'video_url', m.video_url, 'metodo', m.metodo,
      'autor', jsonb_build_object('id', a.id, 'alias', a.alias, 'avatar_url', a.avatar_url, 'nivel', a.nivel),
      'nivel_req', interno.nivel_de_marca(m.habilidad, m.valor),
      'verif', interno.resumen_marca(m.id)) as x
    from marcas m join profiles a on a.id = m.usuario_id
    where m.visibilidad = 'comunidad' and m.video_url is not null and m.usuario_id <> yo
      and m.creado_en > now() - interval '60 days'
      and not interno.hay_bloqueo(yo, m.usuario_id)
      and (not a.modo_invisible or interno.son_amigos(yo, m.usuario_id))
      and not exists (select 1 from verificaciones v where v.marca_id = m.id and v.verificador_id = yo)
      and not entrena_a(m.usuario_id, 'basico')
      and (semilla or (mi is not null and mi >= interno.nivel_de_marca(m.habilidad, m.valor)
                       and (select creado_en from profiles where id = yo) <= now() - interval '3 days'))
    order by (select count(*) from verificaciones v where v.marca_id = m.id), m.creado_en desc limit 20) q;
  return jsonb_build_object('alumnos', al, 'comunidad', co, 'puede_comunidad', semilla or (mi is not null and (select creado_en from profiles where id = yo) <= now() - interval '3 days'));
end $$;

-- Récords visibles de una persona (para su perfil): la mejor marca por habilidad, según privacidad
create or replace function public.records_de(p_alias text) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); dueno uuid;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  select id into dueno from profiles where lower(alias) = lower(btrim(p_alias)) and onboarding_completo;
  if dueno is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(x order by (x->>'valor')::numeric desc) from (
      select distinct on (coalesce(m.habilidad, lower(btrim(m.ejercicio))))
        jsonb_build_object('id', m.id, 'ejercicio', m.ejercicio, 'habilidad', m.habilidad, 'valor', m.valor, 'unidad', m.unidad, 'fecha', m.fecha,
          'metodo', m.metodo, 'video_url', case when m.visibilidad = 'comunidad' or m.usuario_id = yo then m.video_url else null end,
          'verif', interno.resumen_marca(m.id)) as x
      from marcas m
      where m.usuario_id = dueno and interno.puede_ver_marca(yo, m)
      order by coalesce(m.habilidad, lower(btrim(m.ejercicio))), m.valor desc, m.fecha desc
    ) q), '[]'::jsonb);
end $$;

-- Progreso semanal: días entrenados (check-ins o marcas) por semana y racha de semanas que llegan a la meta
create or replace function public.mi_progreso(p_zona text default 'UTC') returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare yo uuid := auth.uid(); tz text := 'UTC'; hoy date; lunes date; meta int; dias date[]; semanas jsonb := '[]'::jsonb; i int; n int; racha int := 0; esta int := 0; cortada boolean := false;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if p_zona is not null and exists (select 1 from pg_timezone_names where name = p_zona) then tz := p_zona; end if;
  hoy := (now() at time zone tz)::date;
  lunes := date_trunc('week', hoy)::date;
  select coalesce(dias_semana, 3) into meta from profiles where id = yo;
  select coalesce(array_agg(d), '{}') into dias from (
    select dia as d from checkins where usuario_id = yo and dia >= lunes - 84
    union select fecha from marcas where usuario_id = yo and fecha >= lunes - 84) x;
  for i in reverse 11..0 loop
    select count(*)::int into n from unnest(dias) d where d >= lunes - 7 * i and d < lunes - 7 * i + 7;
    semanas := semanas || jsonb_build_object('inicio', lunes - 7 * i, 'dias', n);
  end loop;
  select count(*)::int into esta from unnest(dias) d where d >= lunes;
  for i in 0..11 loop
    select count(*)::int into n from unnest(dias) d where d >= lunes - 7 * i and d < lunes - 7 * i + 7;
    if n >= meta then racha := racha + 1;
    elsif i > 0 then exit;
    end if;
  end loop;
  return jsonb_build_object('meta', meta, 'esta', esta, 'racha', racha, 'semanas', semanas);
end $$;

-- 7) Permisos: nada para anon; las RPC solo para sesiones iniciadas
revoke all on function public.verificar_marca(uuid, boolean) from public, anon;
revoke all on function public.retirar_verificacion(uuid) from public, anon;
revoke all on function public.mi_diario(int) from public, anon;
revoke all on function public.para_verificar() from public, anon;
revoke all on function public.records_de(text) from public, anon;
revoke all on function public.mi_progreso(text) from public, anon;
grant execute on function public.verificar_marca(uuid, boolean) to authenticated;
grant execute on function public.retirar_verificacion(uuid) to authenticated;
grant execute on function public.mi_diario(int) to authenticated;
grant execute on function public.para_verificar() to authenticated;
grant execute on function public.records_de(text) to authenticated;
grant execute on function public.mi_progreso(text) to authenticated;
revoke all on table public.verificaciones from anon;
revoke all on table public.habilidades from anon;

-- Ajustes posteriores (aplicados como f13b y f13c):
--   alter function interno.idx_nivel(text) set search_path = '';
--   grant select on table public.habilidades to authenticated;   -- sin este permiso el árbol salía vacío
-- Nota: public.para_verificar se aplicó con la variante que calcula `antiguo` (cuenta con 3+ días) una sola vez;
-- la definición vigente es la de Supabase.
