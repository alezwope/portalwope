-- Fase C: amigos, publicaciones, logros, reacciones, bloqueos y reportes.
-- Toda escritura pasa por funciones (RPC); las tablas solo se leen (lo propio).

create schema if not exists interno;
revoke all on schema interno from public, anon, authenticated;

alter table public.profiles add column if not exists compartir_logros text not null default 'amigos'
  check (compartir_logros in ('amigos','zona','nadie'));
grant update (compartir_logros) on public.profiles to authenticated;

-- ---------- Tablas ----------
create table public.amistades (
  id uuid primary key default gen_random_uuid(),
  solicitante_id uuid not null references public.profiles(id) on delete cascade,
  destinatario_id uuid not null references public.profiles(id) on delete cascade,
  estado text not null default 'pendiente' check (estado in ('pendiente','aceptada')),
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz,
  check (solicitante_id <> destinatario_id)
);
create unique index amistades_par on public.amistades (least(solicitante_id, destinatario_id), greatest(solicitante_id, destinatario_id));
create index amistades_dest on public.amistades (destinatario_id);

create table public.bloqueos (
  bloqueador_id uuid not null references public.profiles(id) on delete cascade,
  bloqueado_id uuid not null references public.profiles(id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (bloqueador_id, bloqueado_id),
  check (bloqueador_id <> bloqueado_id)
);

create table public.publicaciones (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references public.profiles(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 500),
  enlace text check (enlace is null or char_length(enlace) <= 300),
  oculta boolean not null default false,
  creado_en timestamptz not null default now()
);
create index publicaciones_autor on public.publicaciones (autor_id, creado_en desc);

create table public.logros (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  tipo text not null check (tipo in ('nivel','primera_marca','record')),
  clave text not null,
  titulo text not null,
  creado_en timestamptz not null default now(),
  unique (usuario_id, tipo, clave)
);
create index logros_usuario on public.logros (usuario_id, creado_en desc);

create table public.reacciones (
  item_tipo text not null check (item_tipo in ('publicacion','logro')),
  item_id uuid not null,
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (item_tipo, item_id, usuario_id)
);

create table public.reportes (
  id uuid primary key default gen_random_uuid(),
  reportante_id uuid not null references public.profiles(id) on delete cascade,
  item_tipo text not null check (item_tipo in ('publicacion','logro')),
  item_id uuid not null,
  motivo text not null check (char_length(motivo) between 3 and 300),
  estado text not null default 'abierto' check (estado in ('abierto','ocultado','descartado')),
  creado_en timestamptz not null default now(),
  unique (reportante_id, item_tipo, item_id)
);

do $$ declare t text; begin
  foreach t in array array['amistades','bloqueos','publicaciones','logros','reacciones','reportes'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select on table public.%I to authenticated', t);
  end loop;
end $$;

create policy "amistades propias" on public.amistades for select to authenticated
  using (auth.uid() in (solicitante_id, destinatario_id));
create policy "bloqueos propios" on public.bloqueos for select to authenticated using (bloqueador_id = auth.uid());
create policy "publicaciones propias" on public.publicaciones for select to authenticated using (autor_id = auth.uid());
create policy "logros propios" on public.logros for select to authenticated using (usuario_id = auth.uid());
create policy "reacciones propias" on public.reacciones for select to authenticated using (usuario_id = auth.uid());
create policy "reportes admin" on public.reportes for select to authenticated using (public.es_super_admin());

-- ---------- Ayudas internas (no expuestas por la API) ----------
create or replace function interno.hay_bloqueo(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from bloqueos where (bloqueador_id = a and bloqueado_id = b) or (bloqueador_id = b and bloqueado_id = a));
$$;

create or replace function interno.son_amigos(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from amistades where estado = 'aceptada'
    and ((solicitante_id = a and destinatario_id = b) or (solicitante_id = b and destinatario_id = a)));
$$;

-- ¿puede `yo` ver este elemento?
create or replace function interno.puede_ver(yo uuid, p_tipo text, p_id uuid) returns boolean language plpgsql stable security definer set search_path = public as $$
declare dueno uuid; v_oculta boolean := false; comp text; pa char(2); ci text; mp char(2); mc text;
begin
  if p_tipo = 'publicacion' then
    select autor_id, oculta into dueno, v_oculta from publicaciones where id = p_id;
  else
    select usuario_id into dueno from logros where id = p_id;
  end if;
  if dueno is null then return false; end if;
  if dueno = yo then return true; end if;
  if v_oculta or interno.hay_bloqueo(yo, dueno) then return false; end if;
  select compartir_logros, pais, ciudad into comp, pa, ci from profiles where id = dueno;
  if interno.son_amigos(yo, dueno) then return p_tipo = 'publicacion' or comp <> 'nadie'; end if;
  if p_tipo = 'logro' and comp = 'zona' then
    select pais, ciudad into mp, mc from profiles where id = yo;
    return mp is not null and pa = mp and (mc is null or lower(ci) = lower(mc));
  end if;
  return false;
end $$;

-- ---------- Logros automáticos ----------
create or replace function interno.logro_por_nivelacion() returns trigger language plpgsql security definer set search_path = public as $$
declare nombre text := (array['Génesis','Fénix','Guerrero','Maestro','Titán'])[array_position(array['genesis','fenix','guerrero','maestro','titan'], new.nivel)];
begin
  insert into logros (usuario_id, tipo, clave, titulo)
  values (new.usuario_id, 'nivel', new.nivel || coalesce(new.subnivel, ''), 'Alcanzó el nivel ' || nombre || coalesce(' ' || new.subnivel, ''))
  on conflict do nothing;
  return new;
end $$;
create trigger nivelaciones_logro after insert on public.nivelaciones for each row execute function interno.logro_por_nivelacion();

create or replace function interno.logro_por_marca() returns trigger language plpgsql security definer set search_path = public as $$
declare previo numeric; v_unidad text; ej text := lower(btrim(new.ejercicio)); v_valor text; etiqueta text; hoy_id uuid;
begin
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
      update logros set titulo = 'Nuevo récord en ' || etiqueta || ': ' || valor, clave = ej || ':' || new.valor where id = hoy_id;
    else
      insert into logros (usuario_id, tipo, clave, titulo)
      values (new.usuario_id, 'record', ej || ':' || new.valor, 'Nuevo récord en ' || etiqueta || ': ' || v_valor) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
create trigger marcas_logro after insert on public.marcas for each row execute function interno.logro_por_marca();

-- ---------- Funciones públicas (RPC) ----------
create or replace function public.buscar_personas(p_q text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare yo uuid := auth.uid(); q text := lower(btrim(coalesce(p_q, '')));
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if char_length(q) < 2 then return '[]'::jsonb; end if;
  q := replace(replace(replace(q, '\', ''), '%', ''), '_', '');
  return coalesce((select jsonb_agg(x) from (
    select jsonb_build_object('id', p.id, 'alias', p.alias, 'avatar_url', p.avatar_url, 'nivel', p.nivel, 'ciudad', p.ciudad) as x
    from profiles p
    where p.id <> yo and p.onboarding_completo and not p.modo_invisible and lower(p.alias) like q || '%'
      and not interno.hay_bloqueo(yo, p.id)
    order by p.alias limit 10) t), '[]'::jsonb);
end $$;

create or replace function public.perfil_publico(p_alias text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare yo uuid := auth.uid(); p profiles%rowtype; estado text := 'ninguna'; am amistades%rowtype; amigos boolean; ve_logros boolean; lg jsonb := '[]'::jsonb;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  select * into p from profiles where lower(alias) = lower(btrim(p_alias)) and onboarding_completo;
  if not found then return null; end if;
  if p.id <> yo and interno.hay_bloqueo(yo, p.id) then return null; end if;
  amigos := interno.son_amigos(yo, p.id);
  if p.id <> yo and p.modo_invisible and not amigos then return null; end if;
  select * into am from amistades where least(solicitante_id, destinatario_id) = least(yo, p.id) and greatest(solicitante_id, destinatario_id) = greatest(yo, p.id);
  if found then
    estado := case when am.estado = 'aceptada' then 'amigos' when am.solicitante_id = yo then 'enviada' else 'recibida' end;
  end if;
  ve_logros := p.id = yo or (amigos and p.compartir_logros <> 'nadie') or (p.compartir_logros = 'zona' and exists (
    select 1 from profiles m where m.id = yo and m.pais is not null and m.pais = p.pais and (m.ciudad is null or lower(m.ciudad) = lower(p.ciudad))));
  if ve_logros then
    select coalesce(jsonb_agg(jsonb_build_object('id', l.id, 'titulo', l.titulo, 'creado_en', l.creado_en) order by l.creado_en desc), '[]'::jsonb)
    into lg from (select * from logros where usuario_id = p.id order by creado_en desc limit 12) l;
  end if;
  return jsonb_build_object('id', p.id, 'alias', p.alias, 'nombre', p.nombre, 'avatar_url', p.avatar_url, 'bio', p.bio,
    'ciudad', p.ciudad, 'pais', p.pais, 'nivel', p.nivel, 'objetivo', p.objetivo, 'es_yo', p.id = yo,
    'amistad', estado, 'amistad_id', am.id, 'logros', lg, 'logros_visibles', ve_logros);
end $$;

create or replace function public.mis_amigos() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare yo uuid := auth.uid();
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  return (with rel as (
      select a.id as amistad_id, a.estado, a.solicitante_id = yo as soy_solicitante,
             case when a.solicitante_id = yo then a.destinatario_id else a.solicitante_id end as otro
      from amistades a where yo in (a.solicitante_id, a.destinatario_id)),
    det as (
      select r.*, jsonb_build_object('id', p.id, 'alias', p.alias, 'avatar_url', p.avatar_url, 'nivel', p.nivel, 'ciudad', p.ciudad) as persona
      from rel r join profiles p on p.id = r.otro where not interno.hay_bloqueo(yo, r.otro))
    select jsonb_build_object(
      'amigos', coalesce((select jsonb_agg(jsonb_build_object('amistad_id', amistad_id, 'persona', persona) order by persona->>'alias') from det where estado = 'aceptada'), '[]'::jsonb),
      'recibidas', coalesce((select jsonb_agg(jsonb_build_object('amistad_id', amistad_id, 'persona', persona)) from det where estado = 'pendiente' and not soy_solicitante), '[]'::jsonb),
      'enviadas', coalesce((select jsonb_agg(jsonb_build_object('amistad_id', amistad_id, 'persona', persona)) from det where estado = 'pendiente' and soy_solicitante), '[]'::jsonb)));
end $$;

create or replace function public.amistad_enviar(p_destino uuid) returns uuid language plpgsql security definer set search_path = public as $$
declare yo uuid := auth.uid(); d profiles%rowtype; ex amistades%rowtype; nuevo uuid; mi_alias text; pend int;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if p_destino = yo then raise exception 'No puedes agregarte a ti mismo.'; end if;
  select * into d from profiles where id = p_destino and onboarding_completo and not modo_invisible;
  if not found or interno.hay_bloqueo(yo, p_destino) then raise exception 'No encontramos a esa persona.'; end if;
  select * into ex from amistades where least(solicitante_id, destinatario_id) = least(yo, p_destino) and greatest(solicitante_id, destinatario_id) = greatest(yo, p_destino);
  if found then
    if ex.estado = 'aceptada' then raise exception 'Ya son amigos.'; end if;
    if ex.destinatario_id = yo then
      update amistades set estado = 'aceptada', resuelto_en = now() where id = ex.id;
      return ex.id;
    end if;
    raise exception 'Ya enviaste una solicitud.';
  end if;
  select count(*) into pend from amistades where solicitante_id = yo and estado = 'pendiente';
  if pend >= 30 then raise exception 'Tienes muchas solicitudes pendientes. Espera a que respondan.'; end if;
  insert into amistades (solicitante_id, destinatario_id) values (yo, p_destino) returning id into nuevo;
  select alias into mi_alias from profiles where id = yo;
  insert into notificaciones (usuario_id, tipo, titulo, cuerpo, enlace)
  values (p_destino, 'amistad', '@' || mi_alias || ' quiere ser tu compañero de barra', null, '/panel/comunidad#amigos');
  return nuevo;
end $$;

create or replace function public.amistad_resolver(p_id uuid, p_aceptar boolean) returns void language plpgsql security definer set search_path = public as $$
declare yo uuid := auth.uid(); a amistades%rowtype; mi_alias text;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  select * into a from amistades where id = p_id and destinatario_id = yo and estado = 'pendiente';
  if not found then raise exception 'La solicitud ya no existe.'; end if;
  if p_aceptar then
    update amistades set estado = 'aceptada', resuelto_en = now() where id = p_id;
    select alias into mi_alias from profiles where id = yo;
    insert into notificaciones (usuario_id, tipo, titulo, enlace)
    values (a.solicitante_id, 'amistad', '@' || mi_alias || ' aceptó tu solicitud', '/u/' || mi_alias);
  else
    delete from amistades where id = p_id;
  end if;
end $$;

create or replace function public.amistad_quitar(p_otro uuid) returns void language plpgsql security definer set search_path = public as $$
declare yo uuid := auth.uid();
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  delete from amistades where least(solicitante_id, destinatario_id) = least(yo, p_otro) and greatest(solicitante_id, destinatario_id) = greatest(yo, p_otro);
end $$;

create or replace function public.bloquear(p_otro uuid) returns void language plpgsql security definer set search_path = public as $$
declare yo uuid := auth.uid();
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if p_otro = yo then raise exception 'No puedes bloquearte a ti mismo.'; end if;
  if not exists (select 1 from profiles where id = p_otro) then raise exception 'No encontramos a esa persona.'; end if;
  insert into bloqueos (bloqueador_id, bloqueado_id) values (yo, p_otro) on conflict do nothing;
  delete from amistades where least(solicitante_id, destinatario_id) = least(yo, p_otro) and greatest(solicitante_id, destinatario_id) = greatest(yo, p_otro);
end $$;

create or replace function public.desbloquear(p_otro uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Entra a tu cuenta.'; end if;
  delete from bloqueos where bloqueador_id = auth.uid() and bloqueado_id = p_otro;
end $$;

create or replace function public.mis_bloqueos() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'alias', p.alias) order by p.alias), '[]'::jsonb)
  from bloqueos b join profiles p on p.id = b.bloqueado_id where b.bloqueador_id = auth.uid();
$$;

create or replace function public.publicar(p_texto text, p_enlace text default null) returns uuid language plpgsql security definer set search_path = public as $$
declare yo uuid := auth.uid(); t text := btrim(coalesce(p_texto, '')); e text := nullif(btrim(coalesce(p_enlace, '')), ''); hoy int; nuevo uuid;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if char_length(t) < 1 or char_length(t) > 500 then raise exception 'Escribe entre 1 y 500 caracteres.'; end if;
  if e is not null and e !~* '^https://(www\.|m\.)?(youtube\.com|youtu\.be|facebook\.com|fb\.watch)/[^\s]*$' then
    raise exception 'Solo puedes compartir enlaces de YouTube o Facebook.';
  end if;
  if e is not null and char_length(e) > 300 then raise exception 'El enlace es demasiado largo.'; end if;
  select count(*) into hoy from publicaciones where autor_id = yo and creado_en > now() - interval '1 day';
  if hoy >= 10 then raise exception 'Llegaste al máximo de 10 publicaciones por día. ¡Ve a entrenar!'; end if;
  insert into publicaciones (autor_id, texto, enlace) values (yo, t, e) returning id into nuevo;
  return nuevo;
end $$;

create or replace function public.borrar_publicacion(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Entra a tu cuenta.'; end if;
  delete from publicaciones where id = p_id and autor_id = auth.uid();
  if found then delete from reacciones where item_tipo = 'publicacion' and item_id = p_id; end if;
end $$;

create or replace function public.reaccionar(p_tipo text, p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare yo uuid := auth.uid(); n int; ya boolean;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if p_tipo not in ('publicacion','logro') then raise exception 'Tipo inválido.'; end if;
  if not interno.puede_ver(yo, p_tipo, p_id) then raise exception 'No puedes ver esto.'; end if;
  delete from reacciones where item_tipo = p_tipo and item_id = p_id and usuario_id = yo;
  if found then ya := false;
  else insert into reacciones (item_tipo, item_id, usuario_id) values (p_tipo, p_id, yo); ya := true; end if;
  select count(*) into n from reacciones where item_tipo = p_tipo and item_id = p_id;
  return jsonb_build_object('n', n, 'yo', ya);
end $$;

create or replace function public.reportar(p_tipo text, p_id uuid, p_motivo text) returns void language plpgsql security definer set search_path = public as $$
declare yo uuid := auth.uid(); m text := btrim(coalesce(p_motivo, '')); n int;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if p_tipo not in ('publicacion','logro') then raise exception 'Tipo inválido.'; end if;
  if char_length(m) < 3 or char_length(m) > 300 then raise exception 'Cuéntanos el motivo (3 a 300 caracteres).'; end if;
  if not interno.puede_ver(yo, p_tipo, p_id) then raise exception 'No puedes ver esto.'; end if;
  insert into reportes (reportante_id, item_tipo, item_id, motivo) values (yo, p_tipo, p_id, m) on conflict do nothing;
  if p_tipo = 'publicacion' then
    select count(*) into n from reportes where item_tipo = 'publicacion' and item_id = p_id;
    if n >= 3 then update publicaciones set oculta = true where id = p_id; end if;
  end if;
end $$;

create or replace function public.feed(p_pestana text) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare yo uuid := auth.uid(); mi profiles%rowtype; dias interval; r jsonb;
begin
  if yo is null then raise exception 'Entra a tu cuenta.'; end if;
  if p_pestana not in ('amigos','zona','mios') then raise exception 'Pestaña inválida.'; end if;
  select * into mi from profiles where id = yo;
  dias := case when p_pestana = 'mios' then interval '90 days' else interval '14 days' end;
  with permitidos as (
    select yo as id
    union
    select case when solicitante_id = yo then destinatario_id else solicitante_id end
    from amistades where estado = 'aceptada' and yo in (solicitante_id, destinatario_id)
      and not interno.hay_bloqueo(yo, case when solicitante_id = yo then destinatario_id else solicitante_id end)
  ),
  items as (
    (select 'publicacion'::text as tipo, p.id, p.autor_id, p.texto as titulo, p.enlace, p.creado_en
     from publicaciones p
     where p_pestana in ('amigos','mios') and not p.oculta and p.creado_en > now() - dias
       and ((p_pestana = 'amigos' and p.autor_id in (select id from permitidos)) or (p_pestana = 'mios' and p.autor_id = yo)))
    union all
    (select 'logro', l.id, l.usuario_id, l.titulo, null::text, l.creado_en
     from logros l join profiles pr on pr.id = l.usuario_id
     where l.creado_en > now() - dias and (
       (p_pestana = 'mios' and l.usuario_id = yo)
       or (p_pestana = 'amigos' and l.usuario_id in (select id from permitidos) and (l.usuario_id = yo or pr.compartir_logros <> 'nadie'))
       or (p_pestana = 'zona' and l.usuario_id <> yo and pr.compartir_logros = 'zona' and not pr.modo_invisible and pr.onboarding_completo
           and mi.pais is not null and pr.pais = mi.pais and (mi.ciudad is null or lower(pr.ciudad) = lower(mi.ciudad))
           and not interno.hay_bloqueo(yo, l.usuario_id))))
  ),
  top as (select * from items order by creado_en desc limit 40)
  select coalesce(jsonb_agg(jsonb_build_object(
      'tipo', t.tipo, 'id', t.id, 'titulo', t.titulo, 'enlace', t.enlace, 'creado_en', t.creado_en, 'es_mio', t.autor_id = yo,
      'autor', jsonb_build_object('id', a.id, 'alias', a.alias, 'avatar_url', a.avatar_url, 'nivel', a.nivel),
      'reacciones', rx.n, 'yo_reaccione', rx.me) order by t.creado_en desc), '[]'::jsonb)
  into r
  from top t join profiles a on a.id = t.autor_id
  left join lateral (select count(*)::int as n, coalesce(bool_or(re.usuario_id = yo), false) as me from reacciones re where re.item_tipo = t.tipo and re.item_id = t.id) rx on true;
  return r;
end $$;

create or replace function public.admin_reportes() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not es_super_admin() then raise exception 'Sin permiso.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', r.id, 'tipo', r.item_tipo, 'item_id', r.item_id, 'motivo', r.motivo, 'creado_en', r.creado_en,
      'reportante', rp.alias,
      'autor', ap.alias,
      'texto', coalesce(pu.texto, lo.titulo), 'oculta', coalesce(pu.oculta, false)) order by r.creado_en desc)
    from reportes r
    join profiles rp on rp.id = r.reportante_id
    left join publicaciones pu on r.item_tipo = 'publicacion' and pu.id = r.item_id
    left join logros lo on r.item_tipo = 'logro' and lo.id = r.item_id
    left join profiles ap on ap.id = coalesce(pu.autor_id, lo.usuario_id)
    where r.estado = 'abierto'), '[]'::jsonb);
end $$;

create or replace function public.admin_resolver_reporte(p_id uuid, p_ocultar boolean) returns void language plpgsql security definer set search_path = public as $$
declare r reportes%rowtype;
begin
  if not es_super_admin() then raise exception 'Sin permiso.'; end if;
  select * into r from reportes where id = p_id;
  if not found then return; end if;
  if p_ocultar and r.item_tipo = 'publicacion' then update publicaciones set oculta = true where id = r.item_id; end if;
  if p_ocultar and r.item_tipo = 'logro' then delete from logros where id = r.item_id; end if;
  update reportes set estado = case when p_ocultar then 'ocultado' else 'descartado' end where item_tipo = r.item_tipo and item_id = r.item_id and estado = 'abierto';
end $$;

-- Permisos: solo personas con sesión.
do $$ declare f text; begin
  foreach f in array array[
    'buscar_personas(text)','perfil_publico(text)','mis_amigos()','amistad_enviar(uuid)','amistad_resolver(uuid,boolean)','amistad_quitar(uuid)',
    'bloquear(uuid)','desbloquear(uuid)','mis_bloqueos()','publicar(text,text)','borrar_publicacion(uuid)','reaccionar(text,uuid)',
    'reportar(text,uuid,text)','feed(text)','admin_reportes()','admin_resolver_reporte(uuid,boolean)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
revoke execute on all functions in schema interno from public, anon, authenticated;
