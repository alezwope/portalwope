-- Fase E: la ficha del entrenador suma «dónde entrena» y un enlace de contacto. YA APLICADA en Supabase.
alter table public.paginas add column if not exists contacto_url text, add column if not exists lugar text;
alter table public.paginas
  add constraint paginas_contacto_largo check (contacto_url is null or char_length(contacto_url) <= 200),
  add constraint paginas_lugar_largo check (lugar is null or char_length(lugar) <= 120),
  add constraint paginas_contacto_valido check (contacto_url is null or interno.enlace_permitido(contacto_url));
grant select (contacto_url, lugar) on public.paginas to anon, authenticated;
grant update (contacto_url, lugar) on public.paginas to authenticated;
