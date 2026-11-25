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
};

export const requerirPerfil = cache(async () => {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!data) redirect("/entrar");
  if (!data.onboarding_completo) redirect("/onboarding");

  return { supabase, user, perfil: data as Perfil };
});

/** Páginas adicionales (entrenador, tienda, wellness) del usuario actual. */
export const misPaginas = cache(async () => {
  const { supabase } = await requerirPerfil();
  const { data } = await supabase.rpc("mis_paginas");
  return (data ?? []) as Pagina[];
});

/** Solo permite rutas internas para evitar redirecciones a sitios ajenos. */
export function rutaSegura(valor: string | null | undefined, porDefecto = "/panel") {
  if (!valor || !valor.startsWith("/") || valor.startsWith("//") || valor.includes("\\")) return porDefecto;
  return valor;
}

export function urlDelSitio(origenPeticion?: string) {
  return process.env.NEXT_PUBLIC_SITE_URL || origenPeticion || "http://localhost:3000";
}
