export type Persona = { id: string; alias: string; avatar_url: string | null; nivel: string | null; ciudad?: string | null };

export type ItemFeed = {
  tipo: "publicacion" | "logro";
  id: string;
  titulo: string;
  enlace: string | null;
  creado_en: string;
  es_mio: boolean;
  autor: Persona;
  reacciones: number;
  yo_reaccione: boolean;
};

export type Relacion = { amistad_id: string; persona: Persona };
export type MisAmigos = { amigos: Relacion[]; recibidas: Relacion[]; enviadas: Relacion[] };

export type PerfilPublico = {
  id: string; alias: string; nombre: string | null; avatar_url: string | null; bio: string | null;
  ciudad: string | null; pais: string | null; nivel: string | null; objetivo: string | null; es_yo: boolean;
  amistad: "ninguna" | "enviada" | "recibida" | "amigos"; amistad_id: string | null;
  logros: { id: string; titulo: string; creado_en: string }[]; logros_visibles: boolean;
};

export function hace(fecha: string): string {
  const s = Math.max(0, (Date.now() - new Date(fecha).getTime()) / 1000);
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

export const MOTIVOS_REPORTE = ["Spam o publicidad", "Acoso o falta de respeto", "No es de calistenia", "Información falsa o peligrosa", "Otro"] as const;

/** Mensaje legible a partir del error de una función de la base. */
export function mensajeError(e: { message?: string } | null | undefined): string {
  const m = e?.message ?? "";
  return m && m.length < 160 && !/relation|function|column|syntax|permission denied/i.test(m) ? m : "Algo salió mal. Inténtalo de nuevo.";
}
