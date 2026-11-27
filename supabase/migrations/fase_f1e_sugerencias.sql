-- Fase F1e · Buzón de sugerencias con votos + el equipo ve planes inactivos

drop policy "planes visibles" on public.planes_insignia;
create policy "planes visibles" on public.planes_insignia for select to anon, authenticated
  using (activo or public.tiene_permiso('insignias'));
drop policy "beneficios visibles" on public.beneficios;
create policy "beneficios visibles" on public.beneficios for select to anon, authenticated
  using (activo or public.tiene_permiso('insignias'));

insert into public.catalogos (clave, nombre, descripcion) values
  ('categorias_sugerencia', 'Categorías de sugerencias', 'Temas del buzón de sugerencias y votaciones')
on conflict (clave) do nothing;
insert into public.catalogo_items (catalogo, clave, orden, activo, datos) values
  ('categorias_sugerencia','funcion',0,true,'{"es":"Una función nueva","en":"A new feature","pt":"Uma função nova"}'),
  ('categorias_sugerencia','nivelador',1,true,'{"es":"Nivelador y niveles","en":"Level test and levels","pt":"Nivelador e níveis"}'),
  ('categorias_sugerencia','ejercicios',2,true,'{"es":"Ejercicios y progresiones","en":"Exercises and progressions","pt":"Exercícios e progressões"}'),
  ('categorias_sugerencia','camara',3,true,'{"es":"Entrenador virtual y cámara","en":"Virtual trainer and camera","pt":"Treinador virtual e câmera"}'),
  ('categorias_sugerencia','juegos',4,true,'{"es":"Juegos, retos y batallas","en":"Games, challenges and battles","pt":"Jogos, desafios e batalhas"}'),
  ('categorias_sugerencia','parques',5,true,'{"es":"Mapa y parques","en":"Map and parks","pt":"Mapa e parques"}'),
  ('categorias_sugerencia','social',6,true,'{"es":"Comunidad y Crews","en":"Community and Crews","pt":"Comunidade e Crews"}'),
  ('categorias_sugerencia','diseno',7,true,'{"es":"Diseño y facilidad de uso","en":"Design and ease of use","pt":"Design e facilidade de uso"}'),
  ('categorias_sugerencia','otra',8,true,'{"es":"Otra cosa","en":"Something else","pt":"Outra coisa"}')
on conflict do nothing;

insert into public.modulos (clave, nombre, descripcion, etapa, activo, orden)
select 'sugerencias', 'Sugerencias y votaciones', 'La comunidad propone cambios y vota hacia dónde crece UniBars', 1, true,
       coalesce((select max(orden) from public.modulos), 0) + 1
where not exists (select 1 from public.modulos where clave = 'sugerencias');

create table public.sugerencias (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid references public.profiles(id) on delete set null,
  titulo text not null check (char_length(titulo) between 3 and 120),
  texto text not null check (char_length(texto) between 3 and 2000),
  categoria text not null default 'otra',
  estado text not null default 'abierta' check (estado in ('abierta','en_estudio','planificada','hecha','descartada','oculta')),
  respuesta text check (respuesta is null or char_length(respuesta) <= 2000),
  votos_favor integer not null default 0,
  votos_contra integer not null default 0,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create index sugerencias_estado_idx on public.sugerencias (estado, creado_en desc);

create table public.sugerencias_votos (
  sugerencia_id uuid not null references public.sugerencias(id) on delete cascade,
  perfil_id uuid not null references public.profiles(id) on delete cascade,
  voto smallint not null check (voto in (1, -1)),
  creado_en timestamptz not null default now(),
  primary key (sugerencia_id, perfil_id)
);

alter table public.sugerencias enable row level security;
alter table public.sugerencias_votos enable row level security;

create policy "sugerencias visibles" on public.sugerencias for select to authenticated
  using (estado <> 'oculta' or autor_id = (select auth.uid()) or public.tiene_permiso('sugerencias'));
create policy "mis votos" on public.sugerencias_votos for select to authenticated
  using (perfil_id = (select auth.uid()));

revoke all on public.sugerencias, public.sugerencias_votos from anon, authenticated;
grant select on public.sugerencias, public.sugerencias_votos to authenticated;

create or replace function public.sugerir(p_titulo text, p_texto text, p_categoria text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'inicia sesión'; end if;
  if not public.modulo_activo('sugerencias', null) then raise exception 'módulo desactivado'; end if;
  if (select count(*) from sugerencias where autor_id = auth.uid() and creado_en > now() - interval '1 day') >= 5 then
    raise exception 'máximo 5 sugerencias por día';
  end if;
  if not exists (select 1 from catalogo_items where catalogo = 'categorias_sugerencia' and clave = p_categoria and activo) then
    raise exception 'categoría inválida';
  end if;
  insert into sugerencias (autor_id, titulo, texto, categoria)
  values (auth.uid(), btrim(p_titulo), btrim(p_texto), p_categoria) returning id into v_id;
  return v_id;
end $$;

-- voto 1 = a favor, -1 = en contra, 0 = quitar mi voto
create or replace function public.votar_sugerencia(p_id uuid, p_voto smallint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'inicia sesión'; end if;
  if p_voto not in (-1, 0, 1) then raise exception 'voto inválido'; end if;
  if not exists (select 1 from sugerencias where id = p_id and estado not in ('oculta')) then
    raise exception 'sugerencia inexistente';
  end if;
  if p_voto = 0 then
    delete from sugerencias_votos where sugerencia_id = p_id and perfil_id = auth.uid();
  else
    insert into sugerencias_votos (sugerencia_id, perfil_id, voto) values (p_id, auth.uid(), p_voto)
    on conflict (sugerencia_id, perfil_id) do update set voto = excluded.voto, creado_en = now();
  end if;
  update sugerencias set
    votos_favor = (select count(*) from sugerencias_votos where sugerencia_id = p_id and voto = 1),
    votos_contra = (select count(*) from sugerencias_votos where sugerencia_id = p_id and voto = -1)
  where id = p_id;
end $$;

create or replace function public.admin_sugerencia(p_id uuid, p_estado text, p_respuesta text)
returns void language plpgsql security definer set search_path = public as $$
declare v_antes jsonb;
begin
  if not public.tiene_permiso('sugerencias') then raise exception 'sin permiso'; end if;
  select to_jsonb(s) into v_antes from sugerencias s where id = p_id;
  if v_antes is null then raise exception 'sugerencia inexistente'; end if;
  update sugerencias set estado = p_estado, respuesta = p_respuesta, actualizado_en = now() where id = p_id;
  perform interno.auditar('sugerencia.estado', 'sugerencia', p_id::text, v_antes,
    jsonb_build_object('estado', p_estado, 'respuesta', p_respuesta));
end $$;

revoke execute on function public.sugerir(text, text, text), public.votar_sugerencia(uuid, smallint),
  public.admin_sugerencia(uuid, text, text) from public, anon;
grant execute on function public.sugerir(text, text, text), public.votar_sugerencia(uuid, smallint),
  public.admin_sugerencia(uuid, text, text) to authenticated;
