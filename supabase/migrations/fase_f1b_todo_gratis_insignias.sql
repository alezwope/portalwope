-- Decisión 27/11: UniBars es 100 % gratis (también entrenadores, wellness y tiendas).
-- Lo único que se cobra son las insignias (planes con beneficios).
delete from public.ajustes where clave = 'alumnos_gratis';
update public.modulos set nombre = 'Insignias (planes pagos)', descripcion = 'Lo único que se cobra: insignias con beneficios (reseñas, prioridad, app con marca, ejercicios propios…)' where clave = 'verificado';
update public.modulos set nombre = 'Cobros de insignias', descripcion = 'Suscripciones de insignias y patrocinios de competencias' where clave = 'pagos';
