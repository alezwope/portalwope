/** Mensajes en español para los códigos de error de los RPC de planes (el entrenador trabaja en este panel). */
const ERRORES: Record<string, string> = {
  sin_permiso: "No tienes permiso para hacer esto.",
  nombre_requerido: "Ponle un nombre.",
  limite_planes: "Llegaste al máximo de planes de tu página.",
  demasiados_entrenos: "Este plan tiene demasiados entrenamientos.",
  demasiados_ejercicios: "Un entrenamiento tiene demasiados ejercicios.",
  plan_no_existe: "El plan ya no existe.",
  no_es_alumno: "Esa persona no es alumna activa tuya.",
  grupo_no_existe: "El grupo ya no existe.",
  destino_invalido: "Elige una persona o un grupo.",
  fechas_invalidas: "La fecha final no puede ser anterior a la inicial.",
  fecha_invalida: "Elige una fecha futura.",
  ya_resuelta: "Esta propuesta ya fue resuelta.",
  debe_responder_la_otra_parte: "Debe responderla la otra persona.",
};
export function mensajeError(msg: string | undefined | null): string {
  const m = (msg ?? "").trim();
  return ERRORES[m] ?? "No se pudo completar. Inténtalo de nuevo.";
}

export const NIVELES_DB = ["Génesis", "Fénix", "Guerrero", "Maestro", "Titán"] as const;

export type EjercicioCat = { id: string; nombre: string; nivel: string | null; patron: string | null; equipo: string | null };

export const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
