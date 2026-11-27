-- =====================================================================
-- UniBars · Fase F1 · Cimientos (27/11/2026)
-- Seguridad de permisos, equipo y permisos, auditoría, interruptores de
-- módulos, ajustes, catálogos editables, textos/idiomas editables,
-- papelera, comentarios de testers, moderación y notificaciones únicas.
-- Regla: todo cambio de la consola pasa por funciones que revisan el
-- permiso EN LA BASE y quedan registradas en la auditoría.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Endurecer permisos existentes
-- ---------------------------------------------------------------------
-- Nadie del navegador puede vaciar tablas.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' and tablename <> 'spatial_ref_sys' loop
    execute format('revoke truncate on public.%I from anon, authenticated', t.tablename);
    -- Los visitantes sin cuenta solo leen (y solo lo que RLS permita).
    execute format('revoke insert, update, delete on public.%I from anon', t.tablename);
  end loop;
end $$;

revoke insert, update, delete, truncate on public.spatial_ref_sys from anon, authenticated;

-- Las tablas y funciones NUEVAS no nacen abiertas: cada migración da
-- permisos a mano, solo lo necesario.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema interno revoke execute on functions from public, anon, authenticated;

-- Escribir parques y aparatos solo por funciones del servidor (ya no hay
-- políticas de escritura; se quita el permiso de base por si acaso).
revoke insert, update, delete on public.parques, public.aparatos_candidatos from authenticated;
-- config_marca: la edición pasa a funciones de la consola.
revoke insert, update, delete on public.config_marca from authenticated;

-- ---------------------------------------------------------------------
-- 2. Equipo y permisos
-- ---------------------------------------------------------------------
create table public.equipo (
  usuario_id uuid primary key references public.profiles(id) on delete cascade,
  rol text not null check (rol in ('moderador', 'editor')),
  permisos text[] not null default '{}',
  creado_por uuid references public.profiles(id),
  creado_en timestamptz not null default now()
);
alter table public.equipo enable row level security;
grant select on public.equipo to authenticated;
create policy "equipo visible al propio y al admin" on public.equipo for select to authenticated
  using (usuario_id = auth.uid() or public.es_super_admin());

-- Permisos posibles (los usa la consola):
--   moderar, personas, catalogos, textos, modulos, ajustes, parques,
--   anuncios, marketplace, comentarios, auditoria
create or replace function public.tiene_permiso(p_permiso text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_super_admin()
      or exists (select 1 from equipo e where e.usuario_id = auth.uid() and p_permiso = any(e.permisos));
$$;
grant execute on function public.tiene_permiso(text) to anon, authenticated;
grant execute on function public.es_super_admin() to anon, authenticated;

create or replace function public.mis_permisos()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'super_admin', public.es_super_admin(),
    'rol', (select rol from equipo where usuario_id = auth.uid()),
    'permisos', coalesce((select to_jsonb(permisos) from equipo where usuario_id = auth.uid()), '[]'::jsonb)
  );
$$;
grant execute on function public.mis_permisos() to authenticated;

-- ---------------------------------------------------------------------
-- 3. Auditoría (solo se escribe desde funciones; nadie la edita)
-- ---------------------------------------------------------------------
create table public.auditoria (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  accion text not null,
  objeto_tipo text not null,
  objeto_id text,
  antes jsonb,
  despues jsonb,
  creado_en timestamptz not null default now()
);
create index auditoria_fecha on public.auditoria (creado_en desc);
alter table public.auditoria enable row level security;
grant select on public.auditoria to authenticated;
create policy "auditoria para quien tiene permiso" on public.auditoria for select to authenticated
  using (public.tiene_permiso('auditoria'));

create or replace function interno.auditar(p_accion text, p_tipo text, p_id text, p_antes jsonb, p_despues jsonb)
returns void language sql security definer set search_path = public as $$
  insert into auditoria (actor_id, accion, objeto_tipo, objeto_id, antes, despues)
  values (auth.uid(), p_accion, p_tipo, p_id, p_antes, p_despues);
$$;
revoke execute on function interno.auditar(text, text, text, jsonb, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Interruptores de módulos (encender/apagar por etapa y por país)
-- ---------------------------------------------------------------------
create table public.modulos (
  clave text primary key,
  nombre text not null,
  descripcion text,
  etapa smallint not null default 1,
  activo boolean not null default false,
  paises text[],               -- null = todos los países
  orden smallint not null default 0,
  actualizado_en timestamptz not null default now()
);
alter table public.modulos enable row level security;
grant select on public.modulos to anon, authenticated;
create policy "modulos publicos" on public.modulos for select using (true);

insert into public.modulos (clave, nombre, descripcion, etapa, activo, orden) values
  ('universo',      'Universo (feed)',            'Feed de amigos y Crews, publicaciones, reacciones', 1, true, 1),
  ('mapa',          'Mapa y check-in',            'Mapa de calor, parques, entrenando ahora, estadísticas', 1, true, 2),
  ('nivelador',     'Nivelador',                  'Test de nivel por patrones, declarado o con cámara', 1, true, 3),
  ('progreso',      'Mi progreso',                'Diario, árbol de habilidades, récords y verificados', 1, false, 4),
  ('ejercicios',    'Biblioteca de ejercicios',   'Lista pública de ejercicios con video', 1, false, 5),
  ('crews',         'Crews',                      'Grupos que entrenan juntos', 1, false, 6),
  ('eventos',       'Eventos y juntadas',         'Voy / Me interesa, calendario, aforo', 1, false, 7),
  ('calisbro',      'CalisBro',                   'Buscar compañeros de entrenamiento', 1, false, 8),
  ('mensajes',      'Mensajes',                   'Mensajes privados entre amigos, coincidencias y coach-alumno', 1, false, 9),
  ('preguntas',     'Preguntas y técnica',        'Preguntas y respuestas, hilo diario, Revisa mi técnica', 1, false, 10),
  ('escuelas',      'Escuelas y entrenadores',    'Páginas de escuela, alumnos, grupos, planes', 1, true, 11),
  ('coachya',       'CoachYa!',                   'Pedir entrenador y recibir ofertas', 1, false, 12),
  ('paginas',       'Páginas profesionales',      'Wellness, tiendas, constructores de parques', 1, true, 13),
  ('marketplace',   'Marketplace',                'Catálogo con enlace afuera', 1, false, 14),
  ('snack',         'Snack Training',             'Mini entrenamientos con avisos durante el día', 1, false, 15),
  ('herramientas',  'Herramientas',               'Timer, calculadoras, agua, sueño', 1, false, 16),
  ('arcade',        'Arcade y juegos',            'Juegos, batallas, entrenador virtual', 2, false, 20),
  ('retos',         'Retos y batallas',           'Retos cooperativos, retos de parque, batallas', 2, false, 21),
  ('competencias',  'Competencias',               'Llaves, jueces, inscripciones', 2, false, 22),
  ('verificado',    'Verificado de pago',         'Sello, reseñas, ranking, ejercicios propios', 3, false, 30),
  ('pagos',         'Pagos y planes',             'Planes de entrenador, patrocinios, comisiones', 3, false, 31),
  ('anuncios',      'Anuncios',                   'Publicidad (nunca en Modo Entrenar)', 3, false, 32);

create or replace function public.modulo_activo(p_clave text, p_pais text default null)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select activo and (paises is null or p_pais is null or p_pais = any(paises))
                   from modulos where clave = p_clave), false);
$$;
grant execute on function public.modulo_activo(text, text) to anon, authenticated;

create or replace function public.admin_modulo(p_clave text, p_activo boolean, p_paises text[] default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_antes jsonb;
begin
  if not public.tiene_permiso('modulos') then raise exception 'sin permiso'; end if;
  select to_jsonb(m) into v_antes from modulos m where clave = p_clave;
  if v_antes is null then raise exception 'módulo inexistente'; end if;
  update modulos set activo = p_activo, paises = p_paises, actualizado_en = now() where clave = p_clave;
  perform interno.auditar('modulo.cambiar', 'modulo', p_clave, v_antes,
    jsonb_build_object('activo', p_activo, 'paises', p_paises));
end $$;
grant execute on function public.admin_modulo(text, boolean, text[]) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Ajustes generales (clave → valor)
-- ---------------------------------------------------------------------
create table public.ajustes (
  clave text primary key,
  valor jsonb not null,
  descripcion text,
  publico boolean not null default false,
  actualizado_en timestamptz not null default now()
);
alter table public.ajustes enable row level security;
grant select on public.ajustes to anon, authenticated;
create policy "ajustes publicos o para el equipo" on public.ajustes for select
  using (publico or public.tiene_permiso('ajustes'));

insert into public.ajustes (clave, valor, descripcion, publico) values
  ('edad_minima', '16', 'Edad mínima para registrarse', true),
  ('edad_calisbro', '18', 'Edad mínima para CalisBro y mensajes con desconocidos', true),
  ('coachya_vence_dias', '7', 'Días hasta que vence una solicitud de CoachYa!', true),
  ('nivelador_espera_dias', '28', 'Días mínimos entre dos nivelaciones (salvo sugerencia)', true),
  ('idiomas', '["es","en","pt"]', 'Idiomas disponibles', true),
  ('idioma_defecto', '"es"', 'Idioma por defecto', true),
  ('modo_testeo', 'true', 'Muestra el botón de comentarios de testers', true);

create or replace function public.admin_ajuste(p_clave text, p_valor jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_antes jsonb;
begin
  if not public.tiene_permiso('ajustes') then raise exception 'sin permiso'; end if;
  select valor into v_antes from ajustes where clave = p_clave;
  if not found then raise exception 'ajuste inexistente'; end if;
  update ajustes set valor = p_valor, actualizado_en = now() where clave = p_clave;
  perform interno.auditar('ajuste.cambiar', 'ajuste', p_clave, v_antes, p_valor);
end $$;
grant execute on function public.admin_ajuste(text, jsonb) to authenticated;

-- Marca: edición solo por función auditada.
create or replace function public.admin_marca(p_clave text, p_valor jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_antes jsonb;
begin
  if not public.tiene_permiso('ajustes') then raise exception 'sin permiso'; end if;
  select valor into v_antes from config_marca where clave = p_clave;
  insert into config_marca (clave, valor, actualizado_en) values (p_clave, p_valor, now())
  on conflict (clave) do update set valor = excluded.valor, actualizado_en = now();
  perform interno.auditar('marca.cambiar', 'marca', p_clave, v_antes, p_valor);
end $$;
grant execute on function public.admin_marca(text, jsonb) to authenticated;

-- Colores oficiales de la plantilla (reemplazan la paleta "lava" vieja).
update public.config_marca set valor = '{
  "oscuro": {"fondo":"#09090B","tarjeta":"#121216","hover":"#1A1A21","borde":"#27272A","texto":"#F4F4F5","suave":"#A1A1AA","magma":"#FF5500","oro":"#FFB800","rojo":"#EF233C","ambar":"#FF8C00"},
  "claro":  {"fondo":"#F8F7F4","tarjeta":"#FFFFFF","hover":"#F1EFEA","borde":"#E4E2DC","texto":"#18181B","suave":"#52525B","magma":"#FF5500","oro":"#B97F00","rojo":"#D61F35","ambar":"#E07B00"}
}'::jsonb, actualizado_en = now() where clave = 'colores';

-- ---------------------------------------------------------------------
-- 6. Catálogos editables (nada fijo en el código)
-- ---------------------------------------------------------------------
create table public.catalogos (
  clave text primary key,
  nombre text not null,
  descripcion text
);
create table public.catalogo_items (
  id uuid primary key default gen_random_uuid(),
  catalogo text not null references public.catalogos(clave) on delete cascade,
  clave text not null,
  orden smallint not null default 0,
  activo boolean not null default true,
  datos jsonb not null default '{}',   -- nombre por idioma {"es":..,"en":..,"pt":..}, color, ícono, etc.
  actualizado_en timestamptz not null default now(),
  unique (catalogo, clave)
);
alter table public.catalogos enable row level security;
alter table public.catalogo_items enable row level security;
grant select on public.catalogos, public.catalogo_items to anon, authenticated;
create policy "catalogos publicos" on public.catalogos for select using (true);
create policy "items activos publicos" on public.catalogo_items for select
  using (activo or public.tiene_permiso('catalogos'));

insert into public.catalogos (clave, nombre, descripcion) values
  ('niveles', 'Niveles WOPE', 'Los 5 niveles: nombre, color y descripción'),
  ('objetivos', 'Objetivos', 'Objetivos de entrenamiento de las personas'),
  ('tipos_pagina', 'Tipos de página', 'Escuela/entrenador, wellness, tienda, constructor…'),
  ('categorias_wellness', 'Categorías de wellness', 'Nutrición, kinesiología, masajes, psicología…'),
  ('modalidades', 'Modalidades', 'Presencial, a distancia, a domicilio; grupal o individual'),
  ('tipos_evento', 'Tipos de evento', 'Juntada, jam, clase abierta, competencia…'),
  ('motivos_reporte', 'Motivos de reporte', 'Por qué alguien reporta un contenido o persona'),
  ('secciones_marketplace', 'Secciones del marketplace', 'Servicios, digitales, físicos'),
  ('tipos_comentario', 'Tipos de comentario de testers', 'Error, idea, confuso, me gusta');

insert into public.catalogo_items (catalogo, clave, orden, datos) values
  ('niveles','genesis',0,'{"es":"Génesis","en":"Genesis","pt":"Gênesis","color":"#A1A1AA","icono":"🌱"}'),
  ('niveles','fenix',1,'{"es":"Fénix","en":"Phoenix","pt":"Fênix","color":"#22C55E","icono":"🔥"}'),
  ('niveles','guerrero',2,'{"es":"Guerrero","en":"Warrior","pt":"Guerreiro","color":"#3B82F6","icono":"⚔️"}'),
  ('niveles','maestro',3,'{"es":"Maestro","en":"Master","pt":"Mestre","color":"#FF8C00","icono":"🏛️"}'),
  ('niveles','titan',4,'{"es":"Titán","en":"Titan","pt":"Titã","color":"#EF233C","icono":"🗿"}'),
  ('objetivos','salud',0,'{"es":"Salud y bienestar","en":"Health","pt":"Saúde"}'),
  ('objetivos','fuerza',1,'{"es":"Fuerza","en":"Strength","pt":"Força"}'),
  ('objetivos','habilidades',2,'{"es":"Habilidades y trucos","en":"Skills","pt":"Habilidades"}'),
  ('objetivos','musculo',3,'{"es":"Ganar músculo","en":"Build muscle","pt":"Ganhar músculo"}'),
  ('objetivos','grasa',4,'{"es":"Bajar grasa","en":"Lose fat","pt":"Perder gordura"}'),
  ('objetivos','movilidad',5,'{"es":"Movilidad","en":"Mobility","pt":"Mobilidade"}'),
  ('objetivos','competir',6,'{"es":"Competir","en":"Compete","pt":"Competir"}'),
  ('tipos_pagina','entrenador',0,'{"es":"Escuela / Entrenador","en":"School / Coach","pt":"Escola / Treinador","icono":"🏛️"}'),
  ('tipos_pagina','wellness',1,'{"es":"Wellness","en":"Wellness","pt":"Bem-estar","icono":"🌿"}'),
  ('tipos_pagina','tienda',2,'{"es":"Tienda","en":"Store","pt":"Loja","icono":"🛍️"}'),
  ('tipos_pagina','constructor',3,'{"es":"Constructor de parques","en":"Park builder","pt":"Construtor de parques","icono":"🏗️"}'),
  ('categorias_wellness','nutricion',0,'{"es":"Nutrición","en":"Nutrition","pt":"Nutrição"}'),
  ('categorias_wellness','kinesiologia',1,'{"es":"Kinesiología / Fisioterapia","en":"Physiotherapy","pt":"Fisioterapia"}'),
  ('categorias_wellness','masajes',2,'{"es":"Masajes","en":"Massage","pt":"Massagem"}'),
  ('categorias_wellness','psicologia',3,'{"es":"Psicología deportiva","en":"Sports psychology","pt":"Psicologia esportiva"}'),
  ('categorias_wellness','yoga',4,'{"es":"Yoga y movilidad","en":"Yoga & mobility","pt":"Yoga e mobilidade"}'),
  ('modalidades','presencial_grupal',0,'{"es":"Presencial grupal","en":"In person, group","pt":"Presencial em grupo"}'),
  ('modalidades','presencial_individual',1,'{"es":"Presencial individual","en":"In person, 1-on-1","pt":"Presencial individual"}'),
  ('modalidades','domicilio',2,'{"es":"A domicilio","en":"At home","pt":"A domicílio"}'),
  ('modalidades','distancia_grupal',3,'{"es":"A distancia grupal","en":"Online, group","pt":"Online em grupo"}'),
  ('modalidades','distancia_individual',4,'{"es":"A distancia individual","en":"Online, 1-on-1","pt":"Online individual"}'),
  ('tipos_evento','juntada',0,'{"es":"Juntada","en":"Meetup","pt":"Encontro"}'),
  ('tipos_evento','jam',1,'{"es":"Jam session","en":"Jam session","pt":"Jam session"}'),
  ('tipos_evento','clase_abierta',2,'{"es":"Clase abierta","en":"Open class","pt":"Aula aberta"}'),
  ('tipos_evento','competencia',3,'{"es":"Competencia","en":"Competition","pt":"Competição"}'),
  ('motivos_reporte','spam',0,'{"es":"Spam o publicidad","en":"Spam","pt":"Spam"}'),
  ('motivos_reporte','acoso',1,'{"es":"Acoso o falta de respeto","en":"Harassment","pt":"Assédio"}'),
  ('motivos_reporte','inapropiado',2,'{"es":"Contenido inapropiado","en":"Inappropriate","pt":"Inapropriado"}'),
  ('motivos_reporte','peligroso',3,'{"es":"Consejo peligroso","en":"Dangerous advice","pt":"Conselho perigoso"}'),
  ('motivos_reporte','falso',4,'{"es":"Perfil o récord falso","en":"Fake","pt":"Falso"}'),
  ('motivos_reporte','otro',5,'{"es":"Otro","en":"Other","pt":"Outro"}'),
  ('secciones_marketplace','servicios',0,'{"es":"Servicios","en":"Services","pt":"Serviços"}'),
  ('secciones_marketplace','digitales',1,'{"es":"Productos digitales","en":"Digital products","pt":"Produtos digitais"}'),
  ('secciones_marketplace','fisicos',2,'{"es":"Productos físicos","en":"Physical products","pt":"Produtos físicos"}'),
  ('tipos_comentario','error',0,'{"es":"Algo no funciona","en":"Bug","pt":"Erro"}'),
  ('tipos_comentario','confuso',1,'{"es":"No lo entendí","en":"Confusing","pt":"Confuso"}'),
  ('tipos_comentario','idea',2,'{"es":"Tengo una idea","en":"Idea","pt":"Ideia"}'),
  ('tipos_comentario','me_gusta',3,'{"es":"Me encantó","en":"Love it","pt":"Adorei"}');

create or replace function public.admin_catalogo_guardar(p_catalogo text, p_clave text, p_orden smallint, p_activo boolean, p_datos jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_antes jsonb; v_id uuid;
begin
  if not public.tiene_permiso('catalogos') then raise exception 'sin permiso'; end if;
  if p_clave !~ '^[a-z0-9_]{1,40}$' then raise exception 'clave inválida: solo minúsculas, números y _'; end if;
  select to_jsonb(i) into v_antes from catalogo_items i where catalogo = p_catalogo and clave = p_clave;
  insert into catalogo_items (catalogo, clave, orden, activo, datos)
  values (p_catalogo, p_clave, p_orden, p_activo, p_datos)
  on conflict (catalogo, clave) do update set orden = excluded.orden, activo = excluded.activo,
    datos = excluded.datos, actualizado_en = now()
  returning id into v_id;
  perform interno.auditar(case when v_antes is null then 'catalogo.crear' else 'catalogo.editar' end,
    'catalogo:' || p_catalogo, p_clave, v_antes,
    jsonb_build_object('orden', p_orden, 'activo', p_activo, 'datos', p_datos));
  return v_id;
end $$;
grant execute on function public.admin_catalogo_guardar(text, text, smallint, boolean, jsonb) to authenticated;
-- Los ítems no se borran: se desactivan (así no se rompen datos viejos que los usan).

-- ---------------------------------------------------------------------
-- 7. Textos e idiomas editables
-- ---------------------------------------------------------------------
create table public.textos (
  clave text not null,
  idioma text not null check (idioma ~ '^[a-z]{2}$'),
  valor text not null,
  actualizado_en timestamptz not null default now(),
  primary key (clave, idioma)
);
alter table public.textos enable row level security;
grant select on public.textos to anon, authenticated;
create policy "textos publicos" on public.textos for select using (true);

create or replace function public.admin_texto(p_clave text, p_idioma text, p_valor text)
returns void language plpgsql security definer set search_path = public as $$
declare v_antes text;
begin
  if not public.tiene_permiso('textos') then raise exception 'sin permiso'; end if;
  if length(p_valor) > 20000 then raise exception 'texto demasiado largo'; end if;
  select valor into v_antes from textos where clave = p_clave and idioma = p_idioma;
  if p_valor is null or p_valor = '' then
    delete from textos where clave = p_clave and idioma = p_idioma;   -- vuelve al texto de fábrica
  else
    insert into textos (clave, idioma, valor) values (p_clave, p_idioma, p_valor)
    on conflict (clave, idioma) do update set valor = excluded.valor, actualizado_en = now();
  end if;
  perform interno.auditar('texto.cambiar', 'texto', p_clave || ':' || p_idioma,
    to_jsonb(v_antes), to_jsonb(p_valor));
end $$;
grant execute on function public.admin_texto(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 8. Papelera (borrar en dos pasos)
-- ---------------------------------------------------------------------
create table public.papelera (
  id uuid primary key default gen_random_uuid(),
  tabla text not null,
  fila_id text not null,
  fila jsonb not null,
  motivo text,
  borrado_por uuid references public.profiles(id) on delete set null,
  borrado_en timestamptz not null default now()
);
alter table public.papelera enable row level security;
grant select on public.papelera to authenticated;
create policy "papelera para moderacion" on public.papelera for select to authenticated
  using (public.tiene_permiso('moderar'));

-- ---------------------------------------------------------------------
-- 9. Comentarios de testers
-- ---------------------------------------------------------------------
create table public.comentarios_testers (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.profiles(id) on delete set null,
  tipo text not null default 'idea',
  texto text not null check (length(texto) between 3 and 4000),
  ruta text,
  dispositivo text,
  estado text not null default 'nuevo' check (estado in ('nuevo', 'en_curso', 'resuelto', 'descartado')),
  nota_admin text,
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz
);
create index comentarios_estado on public.comentarios_testers (estado, creado_en desc);
alter table public.comentarios_testers enable row level security;
grant select on public.comentarios_testers to authenticated;
create policy "comentarios propios o del equipo" on public.comentarios_testers for select to authenticated
  using (usuario_id = auth.uid() or public.tiene_permiso('comentarios'));

create or replace function public.enviar_comentario(p_tipo text, p_texto text, p_ruta text, p_dispositivo text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_recientes int;
begin
  if auth.uid() is null then raise exception 'inicia sesión'; end if;
  -- Límite anti-spam: 20 comentarios por hora por persona.
  select count(*) into v_recientes from comentarios_testers
   where usuario_id = auth.uid() and creado_en > now() - interval '1 hour';
  if v_recientes >= 20 then raise exception 'demasiados comentarios, prueba más tarde'; end if;
  insert into comentarios_testers (usuario_id, tipo, texto, ruta, dispositivo)
  values (auth.uid(),
          coalesce((select clave from catalogo_items where catalogo = 'tipos_comentario' and clave = p_tipo), 'idea'),
          trim(p_texto), left(p_ruta, 300), left(p_dispositivo, 300))
  returning id into v_id;
  return v_id;
end $$;
grant execute on function public.enviar_comentario(text, text, text, text) to authenticated;

create or replace function public.admin_comentario(p_id uuid, p_estado text, p_nota text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.tiene_permiso('comentarios') then raise exception 'sin permiso'; end if;
  update comentarios_testers set estado = p_estado, nota_admin = p_nota,
    resuelto_en = case when p_estado in ('resuelto', 'descartado') then now() else null end
  where id = p_id;
  perform interno.auditar('comentario.estado', 'comentario_tester', p_id::text, null,
    jsonb_build_object('estado', p_estado, 'nota', p_nota));
end $$;
grant execute on function public.admin_comentario(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 10. Equipo: alta y baja (solo el super admin)
-- ---------------------------------------------------------------------
create or replace function public.admin_equipo(p_alias text, p_rol text, p_permisos text[])
returns void language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_antes jsonb;
begin
  if not public.es_super_admin() then raise exception 'solo el administrador general'; end if;
  select id into v_id from profiles where alias = lower(p_alias);
  if v_id is null then raise exception 'no existe @%', p_alias; end if;
  select to_jsonb(e) into v_antes from equipo e where usuario_id = v_id;
  if p_rol is null then
    delete from equipo where usuario_id = v_id;
  else
    insert into equipo (usuario_id, rol, permisos, creado_por) values (v_id, p_rol, p_permisos, auth.uid())
    on conflict (usuario_id) do update set rol = excluded.rol, permisos = excluded.permisos;
  end if;
  perform interno.auditar('equipo.cambiar', 'persona', v_id::text, v_antes,
    jsonb_build_object('rol', p_rol, 'permisos', p_permisos));
end $$;
grant execute on function public.admin_equipo(text, text, text[]) to authenticated;

-- ---------------------------------------------------------------------
-- 11. Moderación: la cola única se apoya en "reportes"
-- ---------------------------------------------------------------------
alter table public.reportes
  add column if not exists detalle text,
  add column if not exists resuelto_por uuid references public.profiles(id) on delete set null,
  add column if not exists resuelto_en timestamptz,
  add column if not exists resolucion text,
  add column if not exists nota text;

drop policy if exists "reportes admin" on public.reportes;
create policy "reportes para moderacion" on public.reportes for select to authenticated
  using (public.tiene_permiso('moderar'));

-- ---------------------------------------------------------------------
-- 12. Notificaciones: una sola tabla, con quién la causó y datos extra
-- ---------------------------------------------------------------------
alter table public.notificaciones
  add column if not exists actor_id uuid references public.profiles(id) on delete set null,
  add column if not exists datos jsonb not null default '{}';
create index if not exists notificaciones_usuario on public.notificaciones (usuario_id, leida, creado_en desc);

-- ---------------------------------------------------------------------
-- 13. Perfil: preferencias de idioma, tema, unidades y zona horaria
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists idioma text not null default 'es' check (idioma ~ '^[a-z]{2}$'),
  add column if not exists tema text not null default 'oscuro' check (tema in ('oscuro', 'claro', 'sistema')),
  add column if not exists unidades text not null default 'metrico' check (unidades in ('metrico', 'imperial')),
  add column if not exists zona_horaria text not null default 'America/Argentina/Buenos_Aires';
grant update (idioma, tema, unidades, zona_horaria) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 14. Centro de control (números del día para la consola)
-- ---------------------------------------------------------------------
create or replace function public.admin_resumen()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.tiene_permiso('moderar') or public.tiene_permiso('personas')) then
    raise exception 'sin permiso';
  end if;
  return jsonb_build_object(
    'personas', (select count(*) from profiles),
    'personas_semana', (select count(*) from profiles where creado_en > now() - interval '7 days'),
    'paginas', (select count(*) from paginas),
    'parques', (select count(*) from parques),
    'checkins_hoy', (select count(*) from checkins where creado_en > now() - interval '1 day'),
    'reportes_pendientes', (select count(*) from reportes where estado = 'abierto'),
    'comentarios_nuevos', (select count(*) from comentarios_testers where estado = 'nuevo'),
    'modulos_activos', (select count(*) from modulos where activo)
  );
end $$;
grant execute on function public.admin_resumen() to authenticated;
