-- Las funciones de la consola y de comentarios no se pueden llamar sin cuenta.
revoke execute on function public.admin_ajuste(text, jsonb), public.admin_catalogo_guardar(text, text, smallint, boolean, jsonb),
  public.admin_comentario(uuid, text, text), public.admin_equipo(text, text, text[]), public.admin_marca(text, jsonb),
  public.admin_modulo(text, boolean, text[]), public.admin_resumen(), public.admin_texto(text, text, text),
  public.enviar_comentario(text, text, text, text), public.mis_permisos() from public, anon;
alter function interno.enlace_permitido set search_path = public;
