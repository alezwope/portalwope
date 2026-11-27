-- Fase F1f · El cupo de alumnos sale de la insignia (100 gratis; ilimitado con insignia)

create or replace function public.cupo_disponible(p_pagina uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.limite_alumnos(p.id) is null or alumnos_activos(p.id) < public.limite_alumnos(p.id)
  from paginas p where p.id = p_pagina;
$$;

create or replace function public.resolver_vinculo(p_id uuid, p_aceptar boolean, p_escuela uuid default null::uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v vinculos%rowtype; v_pag paginas%rowtype;
begin
  select * into v from vinculos where id = p_id for update;
  if not found or v.estado <> 'solicitud' then raise exception 'Solicitud no disponible'; end if;
  select * into v_pag from paginas where id = v.pagina_id;
  if v_pag.dueno_id <> auth.uid() then raise exception 'No tienes permiso para resolver esta solicitud'; end if;
  if p_aceptar and not cupo_disponible(v.pagina_id) then
    raise exception 'Llegaste a tus % alumnos gratis. Con la insignia puedes tener alumnos ilimitados.', public.limite_alumnos(v.pagina_id);
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
