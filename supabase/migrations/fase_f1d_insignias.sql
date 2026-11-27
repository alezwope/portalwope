-- Fase F1d · Insignias: un plan por rol, beneficios como interruptores, límites editables
-- Decisiones 27/11/2026 (claude/insignias-unibars-wope.md + ranking-y-precios-insignias-wope.md)

-- 1) Planes (uno por rol). Nombre editable es/en/pt. Precios de lanzamiento editables.
create table public.planes_insignia (
  rol text primary key,
  nombre jsonb not null,
  subtitulo jsonb not null default '{}'::jsonb,
  activo boolean not null default true,
  precio_mensual_usd numeric(8,2) not null,
  precio_anual_usd numeric(8,2),
  precios_pais jsonb not null default '{}'::jsonb,
  descuento_fundador_pct smallint not null default 50 check (descuento_fundador_pct between 0 and 100),
  prueba_dias smallint not null default 30 check (prueba_dias >= 0),
  orden smallint not null default 0,
  actualizado_en timestamptz not null default now()
);

-- 2) Beneficios (interruptores) y qué beneficios incluye cada plan
create table public.beneficios (
  clave text primary key,
  nombre jsonb not null,
  descripcion jsonb not null default '{}'::jsonb,
  etapa smallint not null default 1,
  activo boolean not null default true,
  orden smallint not null default 0
);

create table public.plan_beneficios (
  rol text not null references public.planes_insignia(rol) on update cascade on delete cascade,
  beneficio text not null references public.beneficios(clave) on update cascade on delete cascade,
  primary key (rol, beneficio)
);

-- 3) Insignias asignadas (a una página o a una persona)
create table public.insignias (
  id uuid primary key default gen_random_uuid(),
  pagina_id uuid references public.paginas(id) on delete cascade,
  perfil_id uuid references public.profiles(id) on delete cascade,
  rol text not null references public.planes_insignia(rol) on update cascade,
  estado text not null check (estado in ('en_verificacion','activa','regalada','vencida','cancelada')),
  origen text not null check (origen in ('regalo','prueba','pago')),
  desde timestamptz not null default now(),
  hasta timestamptz,
  verificada_en timestamptz,
  otorgada_por uuid,
  nota text,
  creado_en timestamptz not null default now(),
  check (num_nonnulls(pagina_id, perfil_id) = 1)
);
create unique index insignias_pagina_viva on public.insignias (pagina_id)
  where pagina_id is not null and estado in ('en_verificacion','activa','regalada');
create unique index insignias_perfil_viva on public.insignias (perfil_id)
  where perfil_id is not null and estado in ('en_verificacion','activa','regalada');

alter table public.planes_insignia enable row level security;
alter table public.beneficios enable row level security;
alter table public.plan_beneficios enable row level security;
alter table public.insignias enable row level security;

create policy "planes visibles" on public.planes_insignia for select to anon, authenticated using (activo);
create policy "beneficios visibles" on public.beneficios for select to anon, authenticated using (activo);
create policy "plan_beneficios visibles" on public.plan_beneficios for select to anon, authenticated using (true);
create policy "insignias visibles" on public.insignias for select to anon, authenticated using (
  estado in ('activa','regalada')
  or perfil_id = (select auth.uid())
  or exists (select 1 from public.paginas p where p.id = insignias.pagina_id and p.dueno_id = (select auth.uid()))
);

revoke all on public.planes_insignia, public.beneficios, public.plan_beneficios, public.insignias from anon, authenticated;
grant select on public.planes_insignia, public.beneficios, public.plan_beneficios to anon, authenticated;
grant select (id, pagina_id, perfil_id, rol, estado, origen, desde, hasta, verificada_en) on public.insignias to anon, authenticated;

-- 4) Límites editables
insert into public.ajustes (clave, valor, descripcion, publico) values
  ('limite_alumnos_gratis', '100', 'Alumnos que un entrenador puede tener gratis. Con insignia: ilimitados.', true),
  ('limite_productos_gratis', '12', 'Productos que una tienda puede publicar gratis. Con insignia: ilimitados.', true),
  ('cupo_precio_fundador', '100', 'Cantidad de primeras insignias con precio fundador.', false)
on conflict (clave) do nothing;
alter table public.paginas alter column cupo_gratis set default 100;

-- 5) Funciones
create or replace function public.tiene_beneficio(p_beneficio text, p_pagina uuid default null, p_perfil uuid default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from insignias i
    join plan_beneficios pb on pb.rol = i.rol and pb.beneficio = p_beneficio
    join beneficios b on b.clave = pb.beneficio and b.activo
    join planes_insignia pl on pl.rol = i.rol and pl.activo
    where i.estado in ('activa','regalada')
      and (i.hasta is null or i.hasta > now())
      and ((p_pagina is not null and i.pagina_id = p_pagina)
        or (p_perfil is not null and i.perfil_id = p_perfil))
  );
$$;

-- null = ilimitado
create or replace function public.limite_alumnos(p_pagina uuid)
returns integer language sql stable security definer set search_path = public as $$
  select case when public.tiene_beneficio('alumnos_ilimitados', p_pagina, null) then null
         else coalesce((select (valor #>> '{}')::int from ajustes where clave = 'limite_alumnos_gratis'), 100) end;
$$;

create or replace function public.limite_productos(p_pagina uuid)
returns integer language sql stable security definer set search_path = public as $$
  select case when public.tiene_beneficio('productos_ilimitados', p_pagina, null) then null
         else coalesce((select (valor #>> '{}')::int from ajustes where clave = 'limite_productos_gratis'), 12) end;
$$;

create or replace function public.admin_plan_guardar(p_rol text, p_datos jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_antes jsonb;
begin
  if not public.tiene_permiso('insignias') then raise exception 'sin permiso'; end if;
  select to_jsonb(p) into v_antes from planes_insignia p where rol = p_rol;
  if v_antes is null then raise exception 'plan inexistente'; end if;
  update planes_insignia set
    nombre = coalesce(p_datos->'nombre', nombre),
    subtitulo = coalesce(p_datos->'subtitulo', subtitulo),
    activo = coalesce((p_datos->>'activo')::boolean, activo),
    precio_mensual_usd = coalesce((p_datos->>'precio_mensual_usd')::numeric, precio_mensual_usd),
    precio_anual_usd = coalesce((p_datos->>'precio_anual_usd')::numeric, precio_anual_usd),
    precios_pais = coalesce(p_datos->'precios_pais', precios_pais),
    descuento_fundador_pct = coalesce((p_datos->>'descuento_fundador_pct')::smallint, descuento_fundador_pct),
    prueba_dias = coalesce((p_datos->>'prueba_dias')::smallint, prueba_dias),
    actualizado_en = now()
  where rol = p_rol;
  perform interno.auditar('plan_insignia.guardar', 'plan_insignia', p_rol, v_antes, p_datos);
end $$;

create or replace function public.admin_plan_beneficio(p_rol text, p_beneficio text, p_incluido boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.tiene_permiso('insignias') then raise exception 'sin permiso'; end if;
  if p_incluido then
    insert into plan_beneficios (rol, beneficio) values (p_rol, p_beneficio) on conflict do nothing;
  else
    delete from plan_beneficios where rol = p_rol and beneficio = p_beneficio;
  end if;
  perform interno.auditar('plan_insignia.beneficio', 'plan_insignia', p_rol, null,
    jsonb_build_object('beneficio', p_beneficio, 'incluido', p_incluido));
end $$;

create or replace function public.admin_insignia_regalar(p_pagina uuid, p_perfil uuid, p_rol text, p_dias integer, p_nota text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.tiene_permiso('insignias') then raise exception 'sin permiso'; end if;
  if num_nonnulls(p_pagina, p_perfil) <> 1 then raise exception 'indica una página o una persona'; end if;
  if not exists (select 1 from planes_insignia where rol = p_rol) then raise exception 'rol inexistente'; end if;
  insert into insignias (pagina_id, perfil_id, rol, estado, origen, hasta, verificada_en, otorgada_por, nota)
  values (p_pagina, p_perfil, p_rol, 'regalada', 'regalo',
          case when p_dias is null then null else now() + make_interval(days => p_dias) end,
          now(), auth.uid(), p_nota)
  returning id into v_id;
  perform interno.auditar('insignia.regalar', 'insignia', v_id::text, null,
    jsonb_build_object('pagina', p_pagina, 'perfil', p_perfil, 'rol', p_rol, 'dias', p_dias));
  return v_id;
end $$;

create or replace function public.admin_insignia_quitar(p_id uuid, p_motivo text)
returns void language plpgsql security definer set search_path = public as $$
declare v_antes jsonb;
begin
  if not public.tiene_permiso('insignias') then raise exception 'sin permiso'; end if;
  select to_jsonb(i) into v_antes from insignias i where id = p_id;
  if v_antes is null then raise exception 'insignia inexistente'; end if;
  update insignias set estado = 'cancelada', hasta = now(), nota = coalesce(p_motivo, nota) where id = p_id;
  perform interno.auditar('insignia.quitar', 'insignia', p_id::text, v_antes, jsonb_build_object('motivo', p_motivo));
end $$;

create or replace function public.admin_insignias_listar()
returns setof public.insignias language plpgsql stable security definer set search_path = public as $$
begin
  if not public.tiene_permiso('insignias') then raise exception 'sin permiso'; end if;
  return query select * from insignias order by creado_en desc;
end $$;

revoke execute on function public.tiene_beneficio(text, uuid, uuid), public.limite_alumnos(uuid), public.limite_productos(uuid),
  public.admin_plan_guardar(text, jsonb), public.admin_plan_beneficio(text, text, boolean),
  public.admin_insignia_regalar(uuid, uuid, text, integer, text), public.admin_insignia_quitar(uuid, text),
  public.admin_insignias_listar() from public, anon, authenticated;
grant execute on function public.tiene_beneficio(text, uuid, uuid), public.limite_alumnos(uuid), public.limite_productos(uuid) to anon, authenticated;
grant execute on function public.admin_plan_guardar(text, jsonb), public.admin_plan_beneficio(text, text, boolean),
  public.admin_insignia_regalar(uuid, uuid, text, integer, text), public.admin_insignia_quitar(uuid, text),
  public.admin_insignias_listar() to authenticated;

-- 6) Datos iniciales: planes de lanzamiento (USD/mes; anual = 10 meses)
insert into public.planes_insignia (rol, nombre, subtitulo, precio_mensual_usd, precio_anual_usd, orden) values
 ('entrenador',   '{"es":"Sello WOPE","en":"WOPE Seal","pt":"Selo WOPE"}', '{"es":"Entrenador/a certificado/a","en":"Certified trainer","pt":"Treinador(a) certificado(a)"}', 9, 90, 1),
 ('wellness',     '{"es":"Sello WOPE","en":"WOPE Seal","pt":"Selo WOPE"}', '{"es":"Profesional de bienestar certificado","en":"Certified wellness professional","pt":"Profissional de bem-estar certificado"}', 9, 90, 2),
 ('tienda_fisica','{"es":"Sello WOPE","en":"WOPE Seal","pt":"Selo WOPE"}', '{"es":"Tienda certificada","en":"Certified store","pt":"Loja certificada"}', 9, 90, 3),
 ('tienda_digital','{"es":"Sello WOPE","en":"WOPE Seal","pt":"Selo WOPE"}', '{"es":"Tienda digital certificada","en":"Certified digital store","pt":"Loja digital certificada"}', 9, 90, 4),
 ('constructor',  '{"es":"Sello WOPE","en":"WOPE Seal","pt":"Selo WOPE"}', '{"es":"Constructor de parques certificado","en":"Certified park builder","pt":"Construtor de parques certificado"}', 15, 150, 5),
 ('persona',      '{"es":"Sello Impulso","en":"Boost Seal","pt":"Selo Impulso"}', '{"es":"Para quien quiere más ayuda","en":"For those who want more help","pt":"Para quem quer mais ajuda"}', 3, 30, 6);

insert into public.beneficios (clave, nombre, etapa, orden) values
 ('verificacion','{"es":"Verificación e insignia visible"}',1,1),
 ('proteccion_suplantacion','{"es":"Protección contra suplantación"}',1,2),
 ('soporte_prioritario','{"es":"Soporte prioritario de WOPE"}',1,3),
 ('resenas','{"es":"Reseñas de clientes reales y estrellas"}',1,4),
 ('ranking_resenas','{"es":"Ranking por reseñas"}',1,5),
 ('destacado','{"es":"Prioridad rotulada «Destacado»"}',1,6),
 ('estadisticas','{"es":"Estadísticas de visitas y clics"}',1,7),
 ('pagina_link_bio','{"es":"Página «link en bio»"}',1,8),
 ('boton_propio','{"es":"Botón propio y contenido fijado"}',1,9),
 ('alumnos_ilimitados','{"es":"Alumnos ilimitados"}',1,10),
 ('app_marca','{"es":"App con su marca"}',1,11),
 ('asistencia_qr','{"es":"Asistencia por QR en el parque"}',1,12),
 ('volantes_qr','{"es":"Volantes y carteles con QR"}',1,13),
 ('certificados_nivel','{"es":"Certificados de nivel con su logo"}',1,14),
 ('informes_progreso','{"es":"Informes de progreso con su marca"}',1,15),
 ('ejercicios_propios','{"es":"Ejercicios y videos propios"}',1,16),
 ('recordatorios_auto','{"es":"Recordatorios automáticos a alumnos"}',1,17),
 ('recordatorios_pago','{"es":"Recordatorio de fechas de pago de alumnos"}',1,18),
 ('lista_espera','{"es":"Lista de espera y cupos"}',1,19),
 ('simposio_responder','{"es":"Responder en el Simposio de entrenadores"}',1,20),
 ('productos_ilimitados','{"es":"Productos ilimitados"}',1,21),
 ('productos_destacados','{"es":"Productos destacados"}',1,22),
 ('cupones_comunidad','{"es":"Cupones para la comunidad"}',1,23),
 ('etiquetar_publicaciones','{"es":"Etiquetar productos en publicaciones"}',1,24),
 ('formulario_turnos','{"es":"Formulario de pedido de turno"}',1,25),
 ('directorio_prioridad','{"es":"Primero en el directorio"}',1,26),
 ('red_derivaciones','{"es":"Red de derivaciones con entrenadores verificados"}',1,27),
 ('portafolio_mapa','{"es":"Portafolio de parques en el mapa"}',1,28),
 ('pedidos_presupuesto','{"es":"Pedidos de presupuesto"}',1,29),
 ('simposio_pedir_ayuda','{"es":"Pedir ayuda en el Simposio"}',1,30),
 ('ejercicios_con_sello','{"es":"Ejercicios con sello de verificación"}',1,31),
 ('ranking_mundial','{"es":"Ranking mundial de insignias"}',1,32),
 ('revision_pares','{"es":"Revisión entre pares y segunda verificación"}',1,33),
 ('correccion_prioritaria','{"es":"Revisa mi técnica con prioridad"}',1,34),
 ('acceso_anticipado','{"es":"Acceso anticipado a funciones"}',1,35),
 ('votar_reto','{"es":"Votar el próximo reto oficial"}',1,36),
 ('tarjeta_anual_premium','{"es":"Tarjeta del año premium"}',1,37),
 ('estadisticas_avanzadas','{"es":"Estadísticas avanzadas"}',1,38),
 ('temas_perfil','{"es":"Temas y marcos de perfil"}',1,39),
 ('certificado_nivel_sello','{"es":"Certificado de nivel con sello WOPE"}',1,40),
 ('regalar_insignia','{"es":"Regalar insignia a un amigo"}',1,41);

insert into public.plan_beneficios (rol, beneficio)
select r.rol, b from (values
 ('entrenador', array['verificacion','proteccion_suplantacion','soporte_prioritario','resenas','ranking_resenas','destacado','estadisticas','pagina_link_bio','boton_propio','alumnos_ilimitados','app_marca','asistencia_qr','volantes_qr','certificados_nivel','informes_progreso','ejercicios_propios','recordatorios_auto','recordatorios_pago','lista_espera','simposio_responder']),
 ('wellness', array['verificacion','proteccion_suplantacion','soporte_prioritario','resenas','ranking_resenas','destacado','estadisticas','pagina_link_bio','boton_propio','formulario_turnos','directorio_prioridad','red_derivaciones']),
 ('tienda_fisica', array['verificacion','proteccion_suplantacion','soporte_prioritario','resenas','ranking_resenas','destacado','estadisticas','pagina_link_bio','boton_propio','productos_ilimitados','productos_destacados','cupones_comunidad','etiquetar_publicaciones']),
 ('tienda_digital', array['verificacion','proteccion_suplantacion','soporte_prioritario','resenas','ranking_resenas','destacado','estadisticas','pagina_link_bio','boton_propio','productos_ilimitados','productos_destacados','cupones_comunidad','etiquetar_publicaciones']),
 ('constructor', array['verificacion','proteccion_suplantacion','soporte_prioritario','resenas','ranking_resenas','destacado','estadisticas','pagina_link_bio','boton_propio','portafolio_mapa','pedidos_presupuesto']),
 ('persona', array['verificacion','simposio_pedir_ayuda','ejercicios_con_sello','ranking_mundial','revision_pares','correccion_prioritaria','acceso_anticipado','votar_reto','tarjeta_anual_premium','estadisticas_avanzadas','temas_perfil','certificado_nivel_sello','regalar_insignia'])
) as r(rol, beneficios), unnest(r.beneficios) as b;
