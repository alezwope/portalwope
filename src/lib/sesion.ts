import { cache } from "react";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";
import type { TipoPagina } from "@/lib/catalogos";

export type Perfil = {
  id: string;
  alias: string | null;
  nombre: string | null;
  avatar_url: string | null;
  bio: string | null;
  ciudad: string | null;
  pais: string | null;
  nivel: string | null;
  objetivo: string | null;
  es_admin: boolean;
  onboarding_completo: boolean;
  modo_invisible: boolean;
  compartir_logros: "amigos" | "nadie";
  zona_horaria?: string;
  dias_semana?: number | null;
};

export type Pagina = {
  id: string;
  tipo: TipoPagina;
  nombre: string;
  slug: string;
  bio: string | null;
  ciudad: string | null;
  pais: string | null;
  estado: string;
  modalidades: string[];
  atiende_niveles: string[];
  atiende_objetivos: string[];
  especialidad: string | null;
  plan: string;
  cupo_gratis: number;
  contacto_url?: string | null;
  lugar?: string | null;
};

export type Inicio = {
  perfil: Perfil;
  paginas: Pagina[];
  permisos: { super_admin?: boolean; rol?: string | null; permisos?: string[] };
  notificaciones: number;
  mensajes: number;
  tipos_comentario: { clave: string; datos: unknown }[];
};

/** Todo lo que el panel necesita en un solo viaje a la base (perfil, páginas, permisos, contadores). */
export const datosInicio = cache(async () => {
  const supabase = await crearClienteServidor();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) redirect("/entrar");
  const { data } = await supabase.rpc("panel_inicio");
  const inicio = data as Inicio | null;
  if (!inicio?.perfil) redirect("/entrar");
  return { supabase, user: { id: uid }, inicio };
});

export const requerirPerfil = cache(async () => {
  const { supabase, user, inicio } = await datosInicio();
  if (!inicio.perfil.onboarding_completo) redirect("/onboarding");
  return { supabase, user, perfil: inicio.perfil };
});

/** Páginas adicionales (entrenador, tienda, wellness) del usuario actual. */
export const misPaginas = cache(async () => {
  await requerirPerfil();
  return (await datosInicio()).inicio.paginas;
});

/** Solo permite rutas internas para evitar redirecciones a sitios ajenos. */
export function rutaSegura(valor: string | null | undefined, porDefecto = "/panel") {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) return porDefecto;
  return valor;
}

export function urlDelSitio(origenPeticion?: string) {
  return process.env.NEXT_PUBLIC_SITE_URL || origenPeticion || "http://localhost:3000";
}
